from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:Kusum%40199@127.0.0.1:3306/gocomet'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


class RFQ(db.Model):
    __tablename__ = 'rfq'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    bid_start_time = db.Column(db.DateTime, nullable=False)
    bid_close_time = db.Column(db.DateTime, nullable=False)
    forced_close_time = db.Column(db.DateTime, nullable=False)
    trigger_window = db.Column(db.Integer, nullable=False)
    extension_duration = db.Column(db.Integer, nullable=False)
    extension_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)


class Bid(db.Model):
    __tablename__ = 'bids'
    id = db.Column(db.Integer, primary_key=True)
    rfq_id = db.Column(db.Integer, nullable=False)
    bidder_name = db.Column(db.String(100), nullable=False)
    bid_amount = db.Column(db.Float, nullable=False)
    freight_charges = db.Column(db.Float, nullable=True)
    origin_charges = db.Column(db.Float, nullable=True)
    destination_charges = db.Column(db.Float, nullable=True)
    transit_time = db.Column(db.String(50), nullable=True)
    quote_validity = db.Column(db.String(50), nullable=True)
    bid_time = db.Column(db.DateTime, default=datetime.now)


class Log(db.Model):
    __tablename__ = 'logs'
    id = db.Column(db.Integer, primary_key=True)
    rfq_id = db.Column(db.Integer, nullable=False)
    event_type = db.Column(db.String(50))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)


def get_rank(rfq_id):
    bids = Bid.query.filter_by(rfq_id=rfq_id).order_by(Bid.bid_amount.asc()).all()
    return [{"bidder": b.bidder_name, "amount": b.bid_amount} for b in bids]

def get_l1(rfq_id):
    return Bid.query.filter_by(rfq_id=rfq_id).order_by(Bid.bid_amount.asc()).first()

def get_status(rfq):
    now = datetime.now()
    if now >= rfq.forced_close_time:
        return "FORCE_CLOSED"
    elif now >= rfq.bid_close_time:
        return "CLOSED"
    elif now >= rfq.bid_start_time:
        return "ACTIVE"
    else:
        return "NOT_STARTED"

def update_status(rfq):
    rfq.status = get_status(rfq)


@app.route('/')
def home():
    return "Backend running 🚀"


@app.route('/rfq', methods=['POST'])
def create_rfq():
    try:
        data = request.get_json()

        bid_start = datetime.fromisoformat(data['bid_start_time'])
        bid_close = datetime.fromisoformat(data['bid_close_time'])
        forced_close = datetime.fromisoformat(data['forced_close_time'])

        if forced_close <= bid_close:
            return jsonify({"error": "Forced close must be after bid close"}), 400
        if bid_start >= bid_close:
            return jsonify({"error": "Start time must be before close time"}), 400

        rfq = RFQ(
            name=data['name'],
            bid_start_time=bid_start,
            bid_close_time=bid_close,
            forced_close_time=forced_close,
            trigger_window=data['trigger_window'],
            extension_duration=data['extension_duration'],
            extension_type=data['extension_type'],
            status="NOT_STARTED"
        )

        db.session.add(rfq)
        db.session.commit()

        return jsonify({"message": "RFQ created", "rfq_id": rfq.id})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/bid', methods=['POST'])
def place_bid():
    try:
        data = request.get_json()
        rfq = db.session.get(RFQ, data['rfq_id'])

        if not rfq:
            return jsonify({"error": "RFQ not found"}), 404

        now = datetime.now()

        if now >= rfq.forced_close_time:
            return jsonify({"error": "Auction is force closed, no more bids allowed"}), 400

        if now < rfq.bid_start_time:
            return jsonify({"error": "Bidding not started"}), 400

        if now >= rfq.bid_close_time:
            return jsonify({"error": "Bidding is closed"}), 400

        current_l1 = get_l1(rfq.id)
        if current_l1 and data['amount'] >= current_l1.bid_amount:
            return jsonify({
                "error": f"Bid must be lower than current lowest bid of ₹{current_l1.bid_amount}"
            }), 400

        old_ranking = get_rank(rfq.id)
        old_l1 = get_l1(rfq.id)

        bid = Bid(
            rfq_id=rfq.id,
            bidder_name=data['bidder'],
            bid_amount=data['amount'],
            freight_charges=data.get('freight_charges'),
            origin_charges=data.get('origin_charges'),
            destination_charges=data.get('destination_charges'),
            transit_time=data.get('transit_time'),
            quote_validity=data.get('quote_validity')
        )
        db.session.add(bid)
        db.session.flush()

        new_ranking = get_rank(rfq.id)
        new_l1 = get_l1(rfq.id)

        time_left_mins = (rfq.bid_close_time - now).total_seconds() / 60
        should_extend = False

        if time_left_mins <= rfq.trigger_window:
            if rfq.extension_type == "ANY_BID":
                should_extend = True

            elif rfq.extension_type == "RANK_CHANGE":
                old_order = [x['bidder'] for x in old_ranking]
                new_order = [x['bidder'] for x in new_ranking]
                if old_order != new_order:
                    should_extend = True

            elif rfq.extension_type == "L1_CHANGE":
                old_l1_name = old_l1.bidder_name if old_l1 else None
                new_l1_name = new_l1.bidder_name if new_l1 else None
                if old_l1_name != new_l1_name:
                    should_extend = True

        new_close_time = None
        if should_extend:
            extended = rfq.bid_close_time + timedelta(minutes=rfq.extension_duration)
            rfq.bid_close_time = min(extended, rfq.forced_close_time)
            new_close_time = rfq.bid_close_time.isoformat()

            db.session.add(Log(
                rfq_id=rfq.id,
                event_type="EXTENSION",
                description=f"Extended by {rfq.extension_duration} min due to {rfq.extension_type}. New close: {rfq.bid_close_time}"
            ))

        db.session.add(Log(
            rfq_id=rfq.id,
            event_type="BID",
            description=f"{data['bidder']} bid ₹{data['amount']}"
        ))

        rfq.status = "ACTIVE"
        db.session.commit()

        return jsonify({
            "message": "Bid placed successfully",
            "new_close_time": new_close_time,
            "extended": should_extend
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/ranking/<int:rfq_id>')
def ranking(rfq_id):
    bids = Bid.query.filter_by(rfq_id=rfq_id).order_by(Bid.bid_amount.asc()).all()
    return jsonify([
        {
            "rank": i + 1,
            "bidder": b.bidder_name,
            "amount": b.bid_amount,
            "freight_charges": b.freight_charges,
            "origin_charges": b.origin_charges,
            "destination_charges": b.destination_charges,
            "transit_time": b.transit_time,
            "quote_validity": b.quote_validity,
            "bid_time": b.bid_time.isoformat()
        }
        for i, b in enumerate(bids)
    ])


@app.route('/logs/<int:rfq_id>')
def logs(rfq_id):
    logs = Log.query.filter_by(rfq_id=rfq_id).order_by(Log.created_at.desc()).all()
    return jsonify([
        {"event": l.event_type, "desc": l.description, "time": l.created_at.isoformat()}
        for l in logs
    ])


@app.route('/rfq/<int:rfq_id>')
def get_rfq(rfq_id):
    rfq = db.session.get(RFQ, rfq_id)
    if not rfq:
        return jsonify({"error": "Not found"}), 404

    return jsonify({
        "id": rfq.id,
        "name": rfq.name,
        "bid_start_time": rfq.bid_start_time.isoformat(),
        "bid_close_time": rfq.bid_close_time.isoformat(),
        "forced_close_time": rfq.forced_close_time.isoformat(),
        "trigger_window": rfq.trigger_window,
        "extension_duration": rfq.extension_duration,
        "extension_type": rfq.extension_type,
        "status": get_status(rfq)
    })


@app.route('/rfqs')
def get_rfqs():
    rfqs = RFQ.query.all()
    result = []
    for r in rfqs:
        update_status(r)
        l1 = get_l1(r.id)
        result.append({
            "id": r.id,
            "name": r.name,
            "lowest_bid": l1.bid_amount if l1 else None,
            "bid_close_time": r.bid_close_time.isoformat(),
            "forced_close_time": r.forced_close_time.isoformat(),
            "status": r.status
        })
    db.session.commit()
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True)