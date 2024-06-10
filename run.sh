#!/bin/bash

node ./src/index.js 2>&1 | tee ./bot.log
