# 计算机图形学大作业-3D迷宫

本程序是我完全依靠claude3.5写的基于three.js-r169的3D迷宫小游戏。  
到现在我也不会使用three.js。 

## 安装说明
1. 下载 Three.js r169 库：
   - 官方下载：https://github.com/mrdoob/three.js/releases/tag/r169
2. 将本项目文件解压到最高级目录下，保持以下文件结构：

```  
3Dmaze/                            # 最高级目录
│
├── three.js-r169/                 # 这是用户需要下载的Three.js库
│   ├── build/                     # Three.js构建文件
│   ├── examples/                  # 示例和扩展组件
│   ├── src/                       # 源代码
│   └── ...
│
├── demo/                          # 你的3D迷宫项目
│   ├── index.html                 # 主HTML文件
│   ├── index.js                   # 主js文件 (项目的核心文件)
│   ├── build/                     # Three.js主体部分
│   │   ├── three.js
│   │   ├── three.min.js
│   │   └── ...
│   ├── textures/                  # 纹理贴图
│   │   ├── floor/                 # 地面纹理
│   │   └── wall/                  # 墙壁贴图
└── ...
```

3. 使用VSCode和Live Server插件打开项目根目录（3Dmaze）。

4. 导航至 `3Dmaze/demo/index.html` 并右键使用Live Server运行。

## 操作指南：
1. 启动程序后，点击"开始"按钮，进入游戏。
2. 使用键盘 WASD 控制角色移动：
   - W：前进
   - S：后退
   - A：向左转
   - D：向右转
3. 使用键盘方向键 上下左右 控制人物的扭头角度来间接控制视角：
   - ↑：抬头
   - ↓：低头
   - ←：左扭头
   - →：右扭头
4. 使用鼠标左键控制相机旋转，右键移动相机位置，滚轮控制相机缩放。
5. 通过GUI面板，用户可以实时调整相机、光照、天空和时间的各种参数。
6. 点击"重来"按钮可以重置游戏至初始状态。

## 实现较好的方面：
1. **自由的模式切换**。玩家可以使用第一人称视角和轨道视角自由探索迷宫。玩家可以在任意时刻使用鼠标对场景进行漫游，无论游戏是否开始。如游戏开始，玩家任意点击位移键（w/a/s/d），相机会立刻进入第一人称模式。
2. **动态光影**。游戏使用实时光影，如玩家开启较高时间流逝速度。可以清晰看到阴影随时间的变化。
3. **高质量纹理**。墙壁和地面均使用从网上下载的全套高分辨率贴图（法线贴图、粗糙度贴图等），画面接近现实。
4. **移动效果流畅**。玩家移动和相机切换都带有平滑插值效果，运动自然，避免了生硬的跳转。

## 需完善的方面：
1. 迷宫的布局为硬编码，无法修改。可使用相应的迷宫生成等算法每次游戏开始动态地随机地生成新的迷宫。
2. 昼夜循环系统只模拟了每日不同时间段日光和天空的变化，没有绘制出夜晚的月亮星星。而且虽然设置了太阳，由于天空的参数设置不当，白昼时天空的光亮太盛，常常会看不清太阳。
3. 玩家的操作可以进一步细化。比如可以增加按空格跳跃的功能和长按w奔跑的动作增加游戏趣味性。而且有时玩家撞上了墙壁，因为没有碰撞提示，玩家不知道是因为撞到了墙壁所以程序没有反馈，可能会误以为程序出了BUG。这会打消玩家的积极性。
4. 键盘输入有100ms的冷却期，在点按转向键时正合适，但在连续点按w键前进时，会使玩家有不连续感。可以单独在连续输入w时，取消100ms限制。

## 未实现的功能：
1. 没有计时、排行榜等功能，提升游戏竞争性。
2. 没有迷雾小地图，记录玩家已走过的轨迹，增加玩家探索地图的新奇感，并减少游戏的难度。
3. 迷宫的道路过于单调，未加入动态障碍物等设置增加游戏的趣味性。
4. 没有快速通关功能，可以使用深度优先搜索算法搜索出一条通关路径，然后使通关路径的地面变色以指引玩家通关。

