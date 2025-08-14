#!/usr/bin/env python3
import sys, json, math, random

# Very small, illustrative RF-like predictor using bootstrapped averages of recent returns
# No external ML packages used. Not production-grade; for demo purposes.

def read_input():
    raw = sys.stdin.read()
    data = json.loads(raw)
    hist = data.get('historicalData', [])
    days_ahead = int(data.get('daysAhead', 1))
    return hist, days_ahead


def compute_returns(hist):
    closes = [float(h.get('close_price') or h.get('close') or 0) for h in hist]
    rets = []
    for i in range(1, len(closes)):
        if closes[i-1] > 0:
            rets.append((closes[i] - closes[i-1]) / closes[i-1])
    return closes, rets


def tree_predict(rets, window=10):
    if not rets:
        return 0.0
    w = min(window, len(rets))
    recent = rets[-w:]
    # Random subset of recent returns
    k = max(1, w // 2)
    sample = random.sample(recent, k)
    return sum(sample) / len(sample)


def forest_predict(rets, n_trees=25):
    preds = [tree_predict(rets, window=random.randint(5, 15)) for _ in range(n_trees)]
    return sum(preds) / len(preds) if preds else 0.0


def main():
    hist, days_ahead = read_input()
    closes, rets = compute_returns(hist)
    if not closes:
        out = {"predictedPrice": None, "confidence": 0.0}
        print(json.dumps(out))
        return
    last_close = closes[-1]
    drift = forest_predict(rets)
    # Scale by horizon
    drift *= math.sqrt(max(1, days_ahead)) / 2.0
    predicted = last_close * (1 + drift)
    confidence = min(99.0, max(10.0, abs(drift) * 100))
    out = {"predictedPrice": round(predicted, 2), "confidence": round(confidence, 1)}
    print(json.dumps(out))

if __name__ == '__main__':
    main()