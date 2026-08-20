/** The single success envelope every v1 endpoint returns. */
export interface IApiResponse<T> {
  readonly data: T;
  readonly meta: IResponseMeta;
}

export interface IResponseMeta {
  readonly requestId: string;
  readonly timestamp: string;
}

export interface IPaginatedResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly hasNext: boolean;
}
