#!/bin/bash
# Game-to-UCI test generated from:
# 1. d4 e6 2. Nc3 Nf6 3. Nf3 d5 4. e4 dxe4 5. Bc4 exf3
# 6. O-O fxg2 7. Bf4 gxf1=Q+  0-1
# g2g1q e3g1 \

# testing promotion
# d8c8
# 

./startUci.sh <<EOF
uci
isready
ucinewgame
position startpos moves e2e4 g8f6 d1e2 b8c6 g1f3 d7d5 e4d5 d8d5 e2e7 f8e7 b2b4 d5e4 f1e2 e4e2 e1e2 e8g8 g2g3 c6d4 f3d4 c8g4 d4f3 g4f3 e2f3 e7d6 a2a3 f6g4 f3g4 h7h5 g4h5 g7g6 h5g4 f7f5 g4h3 g6g5 f2f4 a8e8 c2c3 g5g4 h3g2 e8e2 g2f1 e2e1 f1e1 f8e8 e1d1 e8e4 a3a4 e4f4 g3f4 g4g3 h2h3 a7a6 d2d4 d6c5 b4c5 a6a5 d4d5 c7c6 d5c6 b7c6 c1e3 g3g2 h1h2
go
quit
EOF
