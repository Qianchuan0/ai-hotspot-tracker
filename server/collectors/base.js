/**
 * 采集器基类 — 所有数据采集器必须实现此接口
 */
export class BaseCollector {
  constructor(name) {
    this.name = name;
  }

  /**
   * 采集数据
   * @param {object} options
   * @param {string[]} [options.keywords] - 要搜索的关键词列表
   * @param {number} [options.sinceTime] - Unix时间戳，只获取此时间之后的内容
   * @returns {Promise<import('./types.js').RawItem[]>}
   */
  async collect(options = {}) {
    throw new Error(`collect() not implemented for ${this.name}`);
  }
}

/**
 * @typedef {Object} RawItem
 * @property {string} id - 唯一标识（用于去重）
 * @property {string} source - 来源标识
 * @property {string} title - 标题
 * @property {string} url - 链接
 * @property {string} content - 内容片段
 * @property {string|null} author - 作者
 * @property {number} publishedAt - 发布时间戳
 * @property {object} rawMetadata - 原始元数据
 */
