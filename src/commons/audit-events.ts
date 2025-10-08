import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { UserIdentityResponse } from "../handlers/user-identity/user-identity-response";

export type TxmaEvent<
  EventName extends string,
  ExtensionsT extends object | undefined = undefined,
  RestrictedT extends object | undefined = undefined,
> = {
  component_id: string;
  event_name: EventName;
  event_timestamp_ms: number;
  timestamp: number;
  extensions: ExtensionsT;
  restricted: RestrictedT;
  user: {
    govuk_signin_journey_id?: string;
    ip_address?: string;
    session_id?: string;
    user_id?: string;
  };
};

export type TxmaSisStoredIdentityReadEvent = TxmaEvent<
  "SIS_STORED_IDENTITY_READ",
  | {
      retrieval_outcome: "success";
      max_vot: IdentityVectorOfTrust | "P0";
      timestamp_fraud_check_iat?: number;
    }
  | {
      retrieval_outcome: "no_record" | "service_error";
    },
  | {
      stored_identity_jwt?: string;
    }
  | undefined
>;

export type TxmaSisStoredIdentityReturnedEvent = TxmaEvent<
  "SIS_STORED_IDENTITY_RETURNED",
  | {
      response_outcome: "returned";
      is_valid: boolean;
      expired: boolean;
      vot: IdentityVectorOfTrust | "P0";
    }
  | {
      response_outcome: "error";
      error_code: string;
    },
  {
    response_body: UserIdentityResponse | string;
  }
>;

export type TxmaSisIdentityRecordInvalidated = TxmaEvent<
  "SIS_IDENTITY_RECORD_INVALIDATED",
  { intervention_code: string }
>;
