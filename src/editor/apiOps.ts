import { nanoid } from 'nanoid';
import type { ApiMethod, ApiSchema, ModelSchema } from '../schema/types';

/**
 * 接口的不可变操作。全是纯函数，风格对齐 modelOps / dbOps。
 */

export const API_PATH_PATTERN = /^\/[a-zA-Z0-9\-_/.{}:]*$/;

export const isValidApiPath = (path: string): boolean =>
  API_PATH_PATTERN.test(path);

export const apiMethodOptions: { value: ApiMethod; label: string }[] = [
  { value: 'get', label: 'GET' },
  { value: 'post', label: 'POST' },
  { value: 'put', label: 'PUT' },
  { value: 'delete', label: 'DELETE' },
  { value: 'patch', label: 'PATCH' },
];

export const API_METHOD_COLORS: Record<ApiMethod, string> = {
  get: 'blue',
  post: 'green',
  put: 'orange',
  delete: 'red',
  patch: 'purple',
};

/** method + path 相同才算路由冲突，key 冲突由校验层兜底 */
export const isRouteTaken = (
  apis: ApiSchema[],
  method: ApiMethod,
  path: string,
  exceptKey?: string,
): boolean =>
  apis.some(
    (api) =>
      api.key !== exceptKey &&
      api.method === method &&
      api.path.trim() === path.trim(),
  );

export const createApi = (apis: ApiSchema[] = []): ApiSchema => {
  const index = apis.length + 1;

  return {
    key: `api_${nanoid(6)}`,
    name: `新接口 ${index}`,
    method: 'get',
    path: `/api/resource_${index}`,
    description: '',
  };
};

export const findApi = (
  apis: ApiSchema[],
  key: string,
): ApiSchema | undefined => apis.find((api) => api.key === key);

export const updateApiInList = (
  apis: ApiSchema[],
  key: string,
  patch: Partial<ApiSchema>,
): ApiSchema[] =>
  apis.map((api) => (api.key === key ? { ...api, ...patch } : api));

export const removeApiFromList = (
  apis: ApiSchema[],
  key: string,
): ApiSchema[] => apis.filter((api) => api.key !== key);

/** 有多少模型正绑定这个接口，删除前要给个明确提示 */
export const countApiRefs = (models: ModelSchema[], apiKey: string): number =>
  models.filter((model) => model.apiKey === apiKey).length;

/** 绑定该接口的模型名称，供删除提示与概览展示 */
export const findApiRefModels = (
  models: ModelSchema[],
  apiKey: string,
): ModelSchema[] => models.filter((model) => model.apiKey === apiKey);

/**
 * 删除接口后，模型上的绑定引用必须一起清掉，否则校验不过；
 * 清空后这些模型处于「未绑定接口」状态，需要重新绑定。
 */
export const clearApiRefsInModels = (
  models: ModelSchema[],
  apiKey: string,
): ModelSchema[] =>
  models.map((model) =>
    model.apiKey === apiKey ? { ...model, apiKey: '' } : model,
  );
