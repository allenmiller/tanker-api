import { DynamoDB, AWSError } from 'aws-sdk';
import { Context, Callback, Handler } from 'aws-lambda';
import { QueryOutput } from 'aws-sdk/clients/dynamodb';
const dynamo = new DynamoDB.DocumentClient();

export const handler:Handler = (event, context:Context, callback:Callback) => { //TODO better type for event
  console.log('Received event:', JSON.stringify(event, null, 2));
  const done = (err:AWSError, res:QueryOutput) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? err : JSON.stringify(res),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
  let startTime;
  let endTime;
  let latest;
  let dataSet;
  console.log(event);
  if (event.params) {
    startTime = event.params.querystring.startTime;
    endTime = event.params.querystring.endTime;
    latest = event.params.querystring.latest;
    dataSet = event.params.querystring.dataSet;
  } else {
    startTime = event.queryStringParameters.startTime;
    endTime = event.queryStringParameters.endTime;
    latest = event.queryStringParameters.latest;
    dataSet = event.queryStringParameters.dataSet;
  }

  let d = new Date();
  let now = d.getTime();

  if (latest) {
    startTime = now - latest * 60000;
    endTime = now;
  }

  let primaryKey;
  if (dataSet) {
    primaryKey = dataSet;
  } else {
    primaryKey = "secondary";
  }
  console.log(primaryKey);
  let params = {
    TableName: "tank2",
    KeyConditionExpression: "tank = :tk AND #ts BETWEEN :start and :end",
    ExpressionAttributeNames: {
      "#ts": "timestamp"
    },
    ExpressionAttributeValues: {
      ":tk": primaryKey,
      ":start": parseInt(startTime),
      ":end": parseInt(endTime)
    }
  };
  console.log(params);
  dynamo.query(params, done);
};
