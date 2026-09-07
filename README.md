# sift

Resume and CV parsing over HTTP. One endpoint, structured JSON out, and a latency number
that is published rather than claimed.

## Why

Measured on the RapidAPI listings for `resume parser`, 2026-09-07:

| listing | published latency | last updated |
|---|---|---|
| Resume Parsing API (top ranked) | 16,052ms | 2 years ago |
| Affordable CV & Resume Parser | 19,688ms | 2 years ago |
| AI Resume Parser | 131,217ms | 2 years ago |

Every one of those calls a model on the hot path. A model call alone costs seconds, so a
service that makes one cannot compete on the number it publishes.

sift parses deterministically. Text layer, section segmentation, and field readers, with no
network call on the common path. The model is a fallback for scanned documents only.

## Status

Early. Not yet deployed.
