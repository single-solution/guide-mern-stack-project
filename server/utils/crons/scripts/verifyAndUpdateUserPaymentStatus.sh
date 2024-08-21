#!/bin/sh
# Navigate to the server directory
cd /home/ubuntu/workspace/server

# Load environment variables from .env file
source .env

# Execute the Node.js script
node utils/crons/verifyAndUpdateUserPaymentStatus.js
