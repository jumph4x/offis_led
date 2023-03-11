OFFIS LED II
============

This is an experiment deploying wireless self-powered LED arrays in the wild. 

Each one is powered by a 36V Li-Ion battery pack, stepped down to 12V, fed to an individually addressable LED strip and controlled using WLED on ESP32s and ESP8266s. 

Components
==========
- Ninebot ES2 headtube battery packs: https://www.amazon.com/Ninebot-External-Battery-Electric-Scooters/dp/B07RM3QRDJ
- DC 12v voltage regulators: https://www.amazon.com/dp/B0BSFNSVNF
- 2-lead weatherseal connectors: https://www.amazon.com/dp/B014IU2EE2
- 42V 2Amp Ninebot charger: https://www.amazon.com/dp/B088WNK3M2
- ESP32: https://www.amazon.com/dp/B08246MCL5
- Direct Current 12v-84v Battery Meter: https://www.amazon.com/dp/B097BQV5HM
- 5ft LED whips: https://www.amazon.com/dp/B07S336J96



Gotchas
=======

ESP32s are a bit quicker than ESP8266s, so for synchronization's sake I ended up setting ESP32 target FPS to 60 and ESP8266 units to 65.