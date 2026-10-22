# 公司培训系统 练习场原型

演示数据，仅供原型展示（demo data only）。

## r4（分支 proto/departments-admin）
- `scenarios.js`：8 个部门的练习场景数据（唯一来源，文案可以整文件替换）。
- `dept.js`：部门场景的通用练习引擎、培训管理后台（顶部切到「管理」进入）、演示员工部门切换。
- 阈值配置：`practice.js` 顶部的 `CONFIG`；点评分档文案：`BAND_COPY`。
- 侧栏「重置演示数据」会清空本机演示数据。



## v2ray 节点配置实操（分支 proto/v2ray-gui，草稿）
- `v2ray-engine.js` 判分引擎（纯函数），`v2ray.js` 界面，入口在练习场「技术实操 · 售后支持」（`#/v2ray`）。
- 判分单测：`node --test tests/`；端到端 + 截图：先 `python3 -m http.server 18931`，再 `python3 tests/v2ray-e2e.py`。
- 扣分文案只改 `v2ray-engine.js` 的 `V2_DEDUCT`；字段表：`node tests/v2ray-fields.js > v2ray-fields.md`。
