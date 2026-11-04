import { describe, expect, it } from 'vitest';
import { defaultProject } from '../mock/data';
import { validateProject } from './validate';

/** 模型的建立依赖接口：apiKey 必填且必须指向存在的接口 */
describe('validateProject · 模型绑定接口', () => {
  it('默认项目通过校验（模型均已绑定接口）', () => {
    const result = validateProject(defaultProject);
    expect(result.ok).toBe(true);
  });

  it('模型缺少 apiKey 时校验失败', () => {
    const project = structuredClone(defaultProject);
    const { apiKey, ...model } = project.models[0]!;
    void apiKey;
    project.models = [model, project.models[1]!];

    const result = validateProject(project);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.includes('apiKey'))).toBe(
        true,
      );
    }
  });

  it('模型引用不存在的接口时校验失败', () => {
    const project = structuredClone(defaultProject);
    project.models[0]!.apiKey = 'api_not_exist';

    const result = validateProject(project);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((issue) =>
          issue.message.includes('引用了不存在的接口'),
        ),
      ).toBe(true);
    }
  });

  it('method + path 重复的接口校验失败', () => {
    const project = structuredClone(defaultProject);
    project.apis = [
      ...project.apis,
      { ...project.apis[0]!, key: 'api_dup', name: '重复接口' },
    ];

    const result = validateProject(project);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.message.includes('不能重复')),
      ).toBe(true);
    }
  });

  it('删除接口后未级联清理模型引用时校验失败', () => {
    const project = structuredClone(defaultProject);
    project.apis = project.apis.slice(0, 1);

    const result = validateProject(project);
    expect(result.ok).toBe(false);
  });
});
