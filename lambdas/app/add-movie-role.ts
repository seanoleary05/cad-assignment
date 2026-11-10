import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { actorKey, ddb, movieKey, type Role, tableName } from "../shared/db";
import { isResponse, parseJsonObject, response } from "../shared/http";

const isPositiveInt = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const body = parseJsonObject(event);
  if (isResponse(body)) return body;

  if (!isPositiveInt(body.movieId)) {
    return response(400, { message: "Invalid movieId" });
  }
  if (!isPositiveInt(body.actorId)) {
    return response(400, { message: "Invalid actorId" });
  }
  if (typeof body.roleName !== "string" || body.roleName.trim() === "") { // empty rolename
    return response(400, { message: "Invalid roleName" });
  }
  if (typeof body.roleDescription !== "string") { // check if roleDescription is a string
    return response(400, { message: "Invalid roleDescription" });
  }

  const role: Role = {
    movieId: body.movieId as number,
    actorId: body.actorId as number,
    roleName: body.roleName as string,
    roleDescription: body.roleDescription as string,
  };

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName,
              Item: {
                PK: movieKey(role.movieId), // Partition key for the movie
                SK: actorKey(role.actorId), // Sort key for the actor
                ...role,
              },
            },
          },
        ],
      })
    );
    return response(201, { message: "Role added", data: role });
  } catch (err) {
    console.error("DynamoDB error:", err);
    return response(500, {
      message: "Internal server error",
      error: err,
    });
  }
};
