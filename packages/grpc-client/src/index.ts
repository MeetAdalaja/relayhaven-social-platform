// Re-export proto types for convenience
export * from "@relayhaven/proto";
export type { RelayHavenClient, RelayHavenClientConfig } from "./client";
export { createRelayHavenClient, DEFAULT_GRPC_HOST } from "./client";
