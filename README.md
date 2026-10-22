# 公司培训系统 练习场原型

演示数据，仅供原型展示（demo data only）。

## r4（分支 proto/departments-admin）
- `scenarios.js`：8 个部门的练习场景数据（唯一来源，文案可以整文件替换）。
- `dept.js`：部门场景的通用练习引擎、培训管理后台（顶部切到「管理」进入）、演示员工部门切换。
- 阈值配置：`practice.js` 顶部的 `CONFIG`；点评分档文案：`BAND_COPY`。
- 侧栏「重置演示数据」会清空本机演示数据。

## 回归测试（R15 起入库）
- 在仓库根目录运行：`python3 tests/run_all.py`（需要 `pip install playwright && playwright install chromium`）。脚本自己在本机随机端口起静态服务，不占用 8813；设 `TP_BASE=<url>` 可以对线上 Pages 跑。
- `tests/r14/`：R14 的回归脚本（8 部门全量 `f.py`/`c.py`、账号外借否定 `neg.py`、S-222 hotfix `hf.py`、运维 4 句 `n.py`、叠加文案 `s.py`、重置 toast `r5.py`），句子原样保留，改成了带断言的写法。
- `tests/r15.py`：R15 第 1–5 项。`tests/shots_r15.py` 只截图，不算回归。
