type BaseAuditEvent = {
  component_id: "SIS";
  event_timestamp_ms: number;
  timestamp: number;
  user: {
    user_id: string;
  };
};

export type IdentityRecordInvalidatedEvent = BaseAuditEvent & {
  event_name: "SIS_IDENTITY_RECORD_INVALIDATED";
  extensions: {
    intervention_code: string;
  };
};

export type AuditEvent = IdentityRecordInvalidatedEvent;
