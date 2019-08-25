// Tank Levels

// Relative to   ground         sensor
// ground level    0              -56
// sensor         56                0
// top of tank    62                6
// alarm level    90               34
// lower limit    137              81
// bottom of tank 202             146

import { DynamoDB, AWSError, SNS } from 'aws-sdk';
import { Context, Callback, Handler } from 'aws-lambda';
import { QueryOutput } from 'aws-sdk/clients/dynamodb';
const dynamo = new DynamoDB.DocumentClient();

// tank levels below ground.

const TOP_OF_TANK = 62;
const ALARM_LEVEL = 90;
const ALERT_LEVEL = 100;
const LOWER_LIMIT = 137;
const BOTTOM = 202;


// TODO: normalize sensor reading distance to represent tank level as measured
// from the surface.

type PumpRecord = {
  tank: string,
  timestamp: number,
  pumpState: number,
  sensor: string,
  distance_cm: number,
  sourceIp: string,
};

export const post:Handler = (event, context:Context, callback:Callback) => {

  console.log('AJM: Received event:', JSON.stringify(event, null, 2));
  console.log('context:', JSON.stringify(context, null, 2));
  const done = (err:AWSError, res:QueryOutput) => {
    console.log("AJM: in done()", err, res);
    callback(null, {
      statusCode: err ? '400' : '200',
      body: err ? err.message : JSON.stringify(res),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  let body = event["body-json"];
  let record:PumpRecord = {
    tank:"",
    timestamp: 0,
    pumpState: -1,
    sensor: "",
    distance_cm: -1,
    sourceIp: ""
  }
  switch (body.type) {

    case 'PUMP_STATE':
        record.tank = body.tank;
        record.timestamp = body.time;
        record.pumpState = body.state;
        break;
    default:
        record.tank = "secondary";
        record.sensor = body.sensor;
        record.timestamp = body.time;
        record.distance_cm = parseFloat(body.distance_cm) + body.sensorLevel;
        record.sourceIp = event.context.sourceIp
  };

  console.log("writing: ", record);
  dynamo.put({TableName: "tank2", Item: record}, done);  //TODO: table name from env

  let ipRecord = {
    "tank": "latestIp",
    "timestamp": 0,
    "ipAddress": event.context.sourceIp
  };

  dynamo.put({TableName: "tank2", Item: ipRecord}, done);  //TODO: table name from env.

  if (record.distance_cm < ALERT_LEVEL) {
    console.log("ALERT: critical tank level!");
    // Publish to SNS topic
    let sns = new SNS();
    sns.publish({    // TODO: Convert to cloudwatch alarm
        TopicArn: 'arn:aws:sns:us-east-1:235694731559:tanker-notify',
        Message: "ALERT: Tank level higher than alert limit",
        Subject: "Tank Level Alert"
      },
      function (err, data) {
        if (err) {
          console.log("Error sending tank level alert " + err);
        }
      });
  }
};
