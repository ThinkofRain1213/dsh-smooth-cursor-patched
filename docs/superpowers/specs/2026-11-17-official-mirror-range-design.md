# 官方 mirror + Range 测量管线设计

## 意图

解决询问卡 textarea 在中英文长按、划词、连续删除、方向移动和滚动时出现的卡顿与瞬移，同时避免重现 iframe 方案的中文组词错位。

## 证据基线

- QP1：每次旧镜像测量平均约 37.66ms；有镜像帧的下一帧间隔平均 79.35ms，无镜像帧为 4.33ms。
- B1 v4：官方 mirror + Range 三种候选全部测量平均 0.071ms，旧算法平均 16.634ms。
- B1 覆盖中文、英文、划词、删除、换行、滚动和 composition。仅剩三个软换行边界与旧算法不同，且三种 Range 候选一致，需实机肉眼确认。

## 目标

- 成功路径不创建、插入或删除任何测量节点。
- 复用官方 mirror 的真实浏览器排版，保持中文、CJK/Latin 间距和滚动位置一致。
- 中文、英文、划词、连续删除、方向键和滚动都降低测量成本。
- 官方 mirror 缺失、陈旧或几何时，安全回退旧算法。

## 非目标与反目标

- 不修改 DSH 官方 React、草稿 store 或官方 mirror。
- 不改变普通聊天框的 `measureRichCaret` 路径。
- 不采用 iframe、canvas 自算折行，不重写缓动、设置页或拖尾。
- 不以“性能提升但光标错位”作为成功。
- 不删除旧算法；它是运行时回退和可恢复基线。

## 方案取舍

1. **采用：官方 mirror + Range**。forward 优先，collapsed 兜底；不把 backward 作为正常路径。
2. 不采用 iframe：曾出现真实中文组词错位。
3. 不采用 canvas：折行、emoji 与字体规则的精度风险高。
4. 不采用继续移动旧镜像 rect 的小补丁：只能减少一处成本，不能覆盖整个故障域。

## 已确定的实现方式

- 官方 mirror 必须是 textarea 的前一个 `div[aria-hidden="true"]` 兄弟节点，且只含一个文本节点。
- 必须满足 `mirror.textContent === textarea.value + '\n'`，否则返回 `null` 并回退。
- 优先建立 `Range(caret → caret + 1)`，读取后一个字符左边缘；没有几何时尝试 collapsed Range。
- 坐标通过 mirror/textarea rect 差值及 `scrollTop/scrollLeft` 修正，不重复添加 half-leading。
- 新辅助函数返回 `CursorPoint | null`；`measureTextareaCaret` 在返回 `null` 时调用旧算法。

## 验收与停止条件

- `typecheck`、`build`、`check:register-id` 全通过。
- 真实页面比较中英文长按、划词、删除、换行、滚动、composition。
- 特别肉眼检查软换行边界。
- 成功路径旧镜像增删应降为零；慢帧和实际绘制跳变应显著下降。
- 若中文或软换行出现不可接受错位，停止替换并回退，不进入发布或提交。

## 留给实施者的事项

- 用 Node 测试模拟 Range、mirror 和滚动，固定坐标映射与回退契约。
- 用真实页面验证软换行边界的视觉正确性。
- 保持工作区不提交、不推送，不主动重启 DSH。
