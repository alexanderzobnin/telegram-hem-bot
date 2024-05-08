#!/bin/bash

docker container rm telegram-hem-bot
docker run --name telegram-hem-bot -d alexanderzobnin/telegram-hem-bot
