import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";

type WithOptionalNever<Key extends PropertyKey, T> = [T] extends [never] ? { [P in Key]?: T } : { [P in Key]: T };

export type TxmaEvent<
  EventName extends string,
  ExtensionsT extends object | undefined = undefined,
  RestrictedT extends object | undefined = undefined,
> = {
  component_id: string;
  event_name: EventName;
  event_timestamp_ms: number;
  timestamp: number;
  user: {
    govuk_signin_journey_id?: string;
    ip_address?: string;
    session_id?: string;
    user_id?: string;
  };
} & WithOptionalNever<"extensions", ExtensionsT> &
  WithOptionalNever<"restricted", RestrictedT>;

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
    response_body: string;
  }
>;

export type TxmaSisIdentityRecordInvalidated = TxmaEvent<
  "SIS_IDENTITY_RECORD_INVALIDATED",
  { intervention_code: string }
>;
