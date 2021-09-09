import Client from "../client";
import { IRevealRecord, RedactionType, revealResponseType } from "../Skyflow";
import { isTokenValid } from "../utils/jwtUtils";

interface IApiSuccessResponse {
  records: [
    {
      token_id: string;
      fields: Record<string, string>;
    }
  ];
}
interface IApiFailureResponse {
  error?: {
    http_code: number;
    grpc_code: number;
    http_status: string;
    message: string;
  };
}

export const fetchRecordsByTokenId = async (
  tokenIdRecords: IRevealRecord[],
  client: Client
): Promise<revealResponseType> => {
  try {
    if (
      client.config.getBearerToken &&
      (!client.accessToken || !isTokenValid(client.accessToken))
    ) {
      client.accessToken = await client.config.getBearerToken();
    }
  } catch (err) {
    throw err;
  }
  let tokenRequest: Record<string, string[]> = {};

  tokenIdRecords.forEach((tokenRecord) => {
    if (tokenRequest[tokenRecord.redaction])
      tokenRequest[tokenRecord.redaction].push(tokenRecord.token);
    else tokenRequest[tokenRecord.redaction] = [tokenRecord.token];
  });

  const vaultResponseSet: Promise<any>[] = Object.entries(tokenRequest).map(
    ([redaction, tokenIds]) => {
      return new Promise((resolve, _) => {
        let apiResponse: any = [];
        getTokenRecordsFromVault(tokenIds, RedactionType[redaction], client)
          .then(
            (response: IApiSuccessResponse) => {
              const fieldsData = formatForPureJsSuccess(response);
              apiResponse.push(...fieldsData);
            },
            (cause: IApiFailureResponse) => {
              let errorSet = formatForPureJsFailure(cause, tokenIds);
              apiResponse.push(...errorSet);
            }
          )
          .finally(() => {
            resolve(apiResponse);
          });
      });
    }
  );

  return new Promise((resolve, _) => {
    Promise.allSettled(vaultResponseSet).then((resultSet) => {
      let recordsResponse: Record<string, any>[] = [];
      let errorResponse: Record<string, any>[] = [];
      resultSet.forEach((result) => {
        if (result.status === "fulfilled") {
          result.value.map((res: Record<string, any>) => {
            if (res.hasOwnProperty("error")) {
              errorResponse.push(res);
            } else {
              recordsResponse.push(res);
            }
          });
        }
      });
      resolve({ records: recordsResponse, errors: errorResponse });
    });
  });
};
const getTokenRecordsFromVault = (
  queryRecordIds: string[],
  redactionType: RedactionType,
  client: Client
): Promise<any> => {
  let paramList: string = "";

  queryRecordIds.forEach((recordId) => {
    paramList += `token_ids=${recordId}&`;
  });

  const vaultEndPointurl: string = `${client.config.vaultURL}/v1/vaults/${client.config.vaultID}/tokens?${paramList}redaction=${redactionType}`;

  return client.request({
    requestMethod: "GET",
    url: vaultEndPointurl,
  });
};

const formatForPureJsSuccess = (response: IApiSuccessResponse) => {
  const currentResponseRecords = response["records"];
  return currentResponseRecords.map((record) => {
    return { token: record["token_id"], ...record["fields"] };
  });
};

const formatForPureJsFailure = (cause: IApiFailureResponse, tokenIds) => {
  return tokenIds.map((tokenId) => ({
    token: tokenId,
    error: {
      code: cause?.error?.http_code || "",
      description: cause?.error?.message || "",
    },
  }));
};

export const formatRecordsForIframe = (response: revealResponseType) => {
  const result: Record<string, string> = {};
  response.records.forEach((record) => {
    const values = Object.values(record);
    result[values[0]] = values[1];
  });
  return result;
};

export const formatRecordsForClient = (response: revealResponseType) => {
  const successRecords = response.records.map((record) => ({
    token: record.token,
  }));
  return { success: successRecords, errors: response.errors };
};
