export type ApiEnvelope<T> = {
  success?: boolean;
  data: T;
  message?: string;
};

export type MutationResult<T> = {
  data: T;
  message?: string;
};

export type DeleteResult = {
  message?: string;
};
