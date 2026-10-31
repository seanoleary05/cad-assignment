import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  ddb,
  isRoleItem,
  movieKey,
  parseId,
  actorKey,
  tableName,
  toRole,
} from "../shared/db";
import { response } from "../shared/http";
import { logRequest } from "../shared/request-logger";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logRequest(event);

  const movieId = parseId(event.pathParameters?.movieID);
  if (movieId === undefined) {
    return response(400, { message: "movieID must be a positive integer" });
  }

  const actorId = parseId(event.queryStringParameters?.actor ?? event.queryStringParameters?.actorID);
  try {

    let keyCondition = "PK = :pk";
    const expressionValues: Record<string, any> = { ":pk": movieKey(movieId) };
    
    if (actorId !== undefined) {
      keyCondition += " AND SK = :sk";
      expressionValues[":sk"] = actorKey(actorId);
    }
    const queryResult = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionValues,
        // ExclusiveStartKey: lastKey,
      })
    );

    const resultItems = queryResult.Items ?? [];
    return response(200, { data: resultItems.filter(isRoleItem).map(toRole) });
  } catch (err) {
    console.error("DynamoDB error:", err);
    return response(500, {
      message: "Internal server error",
      error: err,
    });
  }
};
