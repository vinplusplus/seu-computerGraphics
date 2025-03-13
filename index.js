import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Sky } from 'three/addons/objects/Sky.js';

// ===== 常量定义 =====
const MAZE_CONFIG = {
    CELL_SIZE: 50,
    WALL_HEIGHT: 50,
    OFFSET: 275  // 迷宫中心偏移量
};

const COLORS = {
    WALL: 0x8B4513,  // 深棕色墙壁  
    GROUND: 0x66ff66,  // 草绿色地面
    AMBIENT: 0xffffff  // 环境光颜色
};

// ===== 游戏状态 =====
const gameState = {
    isPlaying: false,
};

// ===== 键盘输入控制 =====
const keys = {};
const keyState = {
    lastMove: Date.now(),    // 上次移动时间
    moveDelay: 100          // 移动间隔（毫秒）
};

window.addEventListener('keydown', (e) => {
    const key = e.key;
    keys[key] = true;
    e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    const key = e.key;
    keys[key] = false;
    e.preventDefault();
});

// 角度变换映射表
const ROTATION_ANGLES = {
    's': 180,    // 向后转向
    'a': 90,     // 向左转向
    'd': -90,    // 向右转向
};

// ===== 迷宫布局 =====
const mazeLayout = [
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1]
];

// 起点和终点坐标
const startPoint = [1, 1];  // 左上角附近的起点
const endPoint = [10, 10];  // 右下角附近的终点


// ===== 游戏配置 =====
const GAME_CONFIG = {
    PLAYER: {
        RADIUS: 10,
        HEIGHT: 20,
        SPEED: 20,
        COLOR: 0xff0000
    },
    START: {
        x: -MAZE_CONFIG.OFFSET + MAZE_CONFIG.CELL_SIZE * (startPoint[0]),  
        z: -MAZE_CONFIG.OFFSET + MAZE_CONFIG.CELL_SIZE * (startPoint[1])   
    },
    END: {
        x: -MAZE_CONFIG.OFFSET + MAZE_CONFIG.CELL_SIZE * (endPoint[0]),  
        z: -MAZE_CONFIG.OFFSET + MAZE_CONFIG.CELL_SIZE * (endPoint[1])   
    }
};

// 相机参数默认值
const DEFAULT_CAMERA_PARAMS = {
    fov: 75,
    near: 0.1,
    far: 4000,
    height: 20,
    smoothness: 0.15,
    rotationSpeed: 2.0  
};

// 创建场景
const scene = new THREE.Scene();

// 创建渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x444444);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById('webgl').appendChild(renderer.domElement);


// 创建相机  
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    4000
);
camera.position.set(0, 35, 0);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// ===== 材质定义 =====
// 加载纹理并配置贴图函数
const textureLoader = new THREE.TextureLoader();
function loadTexture(path, repeat = 1) {
    const texture = textureLoader.load(path);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    return texture;
}

//墙面纹理路径
const wallTexturePaths = {
    map: './textures/wall/diff_4k.jpg',
    normalMap: './textures/wall/nor_gl_4k.jpg',
    roughnessMap: './textures/wall/arm_4k.jpg',
    aoMap: './textures/wall/arm_4k.jpg',
    displacementMap: './textures/wall/disp_4k.jpg'
};

// 加载墙面纹理
const wallTextures = {};
for (const [key, value] of Object.entries(wallTexturePaths)) {
    if (value) {
        wallTextures[key] = loadTexture(value);
    }
}

// 地面纹理路径
const floorTexturePaths = {
    map: './textures/floor/diff.jpg',
    normalMap: './textures/floor/nor.jpg',
    roughnessMap: './textures/floor/rough.jpg',
    aoMap: './textures/floor/ao.jpg',
    displacementMap: './textures/floor/disp.jpg'
};

// 加载地面纹理
const floorTextures = {};
for (const [key, value] of Object.entries(floorTexturePaths)) {
    if (value) {
        floorTextures[key] = loadTexture(value, 10);
    }
}

// 墙壁材质
const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTextures.map || null,
    normalMap: wallTextures.normalMap || null,
    roughnessMap: wallTextures.roughnessMap || null,
    aoMap: wallTextures.aoMap || null,
    displacementMap: wallTextures.displacementMap || null,
    displacementScale: 0.1,
    aoMapIntensity: 1.0,
    side: THREE.DoubleSide
});

// 地面材质
const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTextures.map || null,
    normalMap: floorTextures.normalMap || null,
    roughnessMap: floorTextures.roughnessMap || null,
    aoMap: floorTextures.aoMap || null,
    displacementMap: floorTextures.displacementMap || null,
    color: 0x90EE90,
    roughness: 0.5,
    metalness: 0.05,
    aoMapIntensity: 0.8,
    displacementScale: 0.5,
    displacementBias: 0.2,
    side: THREE.DoubleSide
});

// 墙壁几何体
const wallGeometry = new THREE.BoxGeometry(
    MAZE_CONFIG.CELL_SIZE,
    MAZE_CONFIG.WALL_HEIGHT,
    MAZE_CONFIG.CELL_SIZE,
    32,
    16,
    32
);

// 地面几何体  
const floorGeometry = new THREE.PlaneGeometry(1000, 1000);

// 创建地面
function createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -MAZE_CONFIG.WALL_HEIGHT / 2;
    // 开启阴影接收
    floor.receiveShadow = true;
    // 为了更好的光照效果，添加第二个UV通道
    floor.geometry.setAttribute(
        'uv2',
        new THREE.Float32BufferAttribute(floor.geometry.attributes.uv.array, 2)
    );

    return floor;
}

// 创建迷宫
function createMaze() {
    const mazeGroup = new THREE.Group();
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    for (let i = 0; i < mazeLayout.length; i++) {
        for (let j = 0; j < mazeLayout[i].length; j++) {
            if (mazeLayout[i][j] === 1) {
                const wall = wallMesh.clone();
                wall.position.set(
                    j * MAZE_CONFIG.CELL_SIZE - MAZE_CONFIG.OFFSET,
                    0,
                    i * MAZE_CONFIG.CELL_SIZE - MAZE_CONFIG.OFFSET
                );
                wall.castShadow = true;
                wall.receiveShadow = true;
                mazeGroup.add(wall);
            }
        }
    }
    return mazeGroup;
}

class DayNightSystem {
    constructor(scene, sunLight, sky, ambientLight) {
        this.scene = scene;
        this.sunLight = sunLight;
        this.sky = sky;
        this.ambientLight = ambientLight;
        this.timeController = null;

        // 循环参数
        this.parameters = {
            cycleSpeed: 0.1,           // 昼夜循环速度
            time: 6,                   // 初始时间设为早上6点
            autoRotate: true,          // 是否自动循环
            altitude: 0,               // 太阳高度角
            azimuth: 180,             // 太阳方位角
            exposure: 0.5,             // 曝光度
            turbidity: 2.5,           // 浑浊度
            rayleigh: 1.5,            // 瑞利散射
            mieCoefficient: 0.005,    // 米氏散射系数
            mieDirectionalG: 0.7,     // 米氏散射方向
            sunIntensity: 1,          // 阳光强度
            ambientIntensity: 0.5     // 环境光强度
        };
        // 时间状态划分
        this.timeStates = {
            NIGHT: { start: 0, end: 5 },      // 深夜：0点到5点
            SUNRISE: { start: 5, end: 7 },     // 日出：5点到7点
            MORNING: { start: 7, end: 11 },    // 上午：7点到11点
            NOON: { start: 11, end: 13 },      // 正午：11点到13点
            AFTERNOON: { start: 13, end: 17 }, // 下午：13点到17点
            SUNSET: { start: 17, end: 19 },    // 日落：17点到19点
            EVENING: { start: 19, end: 24 }    // 夜晚：19点到24点
        };
        this.updateSkyUniforms();
    }

    // 更新天空材质uniforms
    updateSkyUniforms() {
        if (this.sky && this.sky.material && this.sky.material.uniforms) {
            const uniforms = this.sky.material.uniforms;
            uniforms.turbidity.value = this.parameters.turbidity;
            uniforms.rayleigh.value = this.parameters.rayleigh;
            uniforms.mieCoefficient.value = this.parameters.mieCoefficient;
            uniforms.mieDirectionalG.value = this.parameters.mieDirectionalG;
        }
    }

    update() {
        if (!this.parameters.autoRotate) return;
        // 更新时间
        this.parameters.time += this.parameters.cycleSpeed * 0.016; // 假设60fps
        if (this.parameters.time >= 24) this.parameters.time = 0;
        if (this.timeController) {
            this.timeController.updateDisplay();
        }
        // 计算太阳位置
        this.updateSunPosition();
        // 更新天空参数
        this.updateSkyParameters();
        // 更新光照强度
        this.updateLightIntensity();
    }

    updateSunPosition() {
        // 修改太阳位置的计算方法
        const timeNormalized = this.parameters.time / 24;
        const theta = Math.PI * (timeNormalized - 0.5); // 调整角度范围为 -π/2 到 π/2
        // 计算太阳高度角，使用余弦函数创造更平滑的运动
        this.parameters.altitude = Math.cos(theta) * 90; // 范围 -90° 到 90°
        // 计算方位角，创造东西方向的运动
        this.parameters.azimuth = (timeNormalized * 360 + 180) % 360;
        // 转换为弧度并计算位置
        const phi = THREE.MathUtils.degToRad(90 - this.parameters.altitude);
        const azimuth = THREE.MathUtils.degToRad(this.parameters.azimuth);
        const sunPosition = new THREE.Vector3();
        sunPosition.setFromSphericalCoords(1, phi, azimuth);
        // 更新天空和光照
        this.sky.material.uniforms.sunPosition.value.copy(sunPosition);
        this.sunLight.position.copy(sunPosition.multiplyScalar(200));
        // 根据太阳高度调整光照强度
        const baseIntensity = Math.max(Math.sin(theta + Math.PI / 2), 0);
        this.sunLight.intensity = baseIntensity * this.parameters.sunIntensity;
    }

    getCurrentTimeState() {
        const { time } = this.parameters;
        // 检查当前时间属于哪个时间段
        for (const [state, range] of Object.entries(this.timeStates)) {
            if (time >= range.start && time < range.end) {
                return state;
            }
        }
        return 'NIGHT'; // 默认返回夜晚状态
    }

    updateSkyParameters() {
        const currentState = this.getCurrentTimeState();
        const { time } = this.parameters;
        this.updateSkyUniforms();
        // 根据时间状态调整天空参数
        switch (currentState) {
            case 'NIGHT':
                // 深夜：非常暗
                this.parameters.turbidity = 0.5;
                this.parameters.rayleigh = 3.0;
                this.parameters.mieCoefficient = 0.008;
                this.parameters.exposure = 0.05; // 降低曝光使夜晚更暗
                break;
            case 'SUNRISE':
                // 日出：从暗到亮的渐变
                const sunriseProgress = this.getStateProgress(time, this.timeStates.SUNRISE);
                this.parameters.turbidity = this.lerp(0.5, 8, sunriseProgress);
                this.parameters.rayleigh = this.lerp(3.0, 2.0, sunriseProgress);
                this.parameters.mieCoefficient = this.lerp(0.008, 0.005, sunriseProgress);
                this.parameters.exposure = this.lerp(0.05, 0.7, sunriseProgress); // 逐渐增加曝光
                break;
            case 'MORNING':
                // 清晨：明亮清新
                this.parameters.turbidity = 10;
                this.parameters.rayleigh = 2.0;
                this.parameters.mieCoefficient = 0.005;
                this.parameters.exposure = 0.8; // 明亮的早晨
                break;
            case 'NOON':
                // 正午：最亮
                this.parameters.turbidity = 12;
                this.parameters.rayleigh = 1.0;
                this.parameters.mieCoefficient = 0.003;
                this.parameters.exposure = 1.0; // 最高曝光
                break;
            case 'AFTERNOON':
                // 下午：略微降低亮度
                this.parameters.turbidity = 15;
                this.parameters.rayleigh = 2.0;
                this.parameters.mieCoefficient = 0.004;
                this.parameters.exposure = 0.85; // 略低于正午
                break;
            case 'SUNSET':
                // 日落：戏剧性的渐变
                const sunsetProgress = this.getStateProgress(time, this.timeStates.SUNSET);
                this.parameters.turbidity = this.lerp(15, 0.5, sunsetProgress);
                this.parameters.rayleigh = this.lerp(2.0, 3.0, sunsetProgress);
                this.parameters.mieCoefficient = this.lerp(0.004, 0.008, sunsetProgress);
                this.parameters.exposure = this.lerp(0.7, 0.1, sunsetProgress); // 逐渐降低曝光
                break;
            case 'EVENING':
                // 傍晚到深夜：逐渐变暗
                const eveningProgress = this.getStateProgress(time, this.timeStates.EVENING);
                this.parameters.turbidity = 0.5;
                this.parameters.rayleigh = 3.0;
                this.parameters.mieCoefficient = 0.008;
                this.parameters.exposure = this.lerp(0.1, 0.05, eveningProgress); // 继续降低曝光
                break;
        }

        // 更新天空材质参数
        this.sky.material.uniforms.turbidity.value = this.parameters.turbidity;
        this.sky.material.uniforms.rayleigh.value = this.parameters.rayleigh;
        this.sky.material.uniforms.mieCoefficient.value = this.parameters.mieCoefficient;
        this.sky.material.uniforms.mieDirectionalG.value = this.parameters.mieDirectionalG;

        // 更新渲染器的曝光度
        if (renderer) {
            renderer.toneMappingExposure = this.parameters.exposure;
        }
    }

    updateLightIntensity() {
        const currentState = this.getCurrentTimeState();
        const { time } = this.parameters;
        // 根据时间状态调整光照强度
        switch (currentState) {
            case 'NIGHT':
                // 深夜：最低光照
                this.parameters.sunIntensity = 0.05;
                this.parameters.ambientIntensity = 0.1;
                break;
            case 'SUNRISE':
                // 日出：逐渐增加光照
                const sunriseProgress = this.getStateProgress(time, this.timeStates.SUNRISE);
                this.parameters.sunIntensity = this.lerp(0.05, 0.8, sunriseProgress);
                this.parameters.ambientIntensity = this.lerp(0.1, 0.5, sunriseProgress);
                break;
            case 'MORNING':
                // 清晨：明亮但不刺眼
                this.parameters.sunIntensity = 0.9;
                this.parameters.ambientIntensity = 0.6;
                break;
            case 'NOON':
                // 正午：最强光照
                this.parameters.sunIntensity = 1.2;
                this.parameters.ambientIntensity = 0.7;
                break;
            case 'AFTERNOON':
                // 下午：开始减弱
                this.parameters.sunIntensity = 0.9;
                this.parameters.ambientIntensity = 0.6;
                break;
            case 'SUNSET':
                // 日落：光照逐渐变暗
                const sunsetProgress = this.getStateProgress(time, this.timeStates.SUNSET);
                this.parameters.sunIntensity = this.lerp(0.8, 0.05, sunsetProgress);
                this.parameters.ambientIntensity = this.lerp(0.5, 0.1, sunsetProgress);
                break;
            case 'EVENING':
                // 夜晚：维持低光照
                this.parameters.sunIntensity = 0.05;
                this.parameters.ambientIntensity = 0.1;
                break;
        }
        // 更新光照强度
        this.sunLight.intensity = this.parameters.sunIntensity;
        this.ambientLight.intensity = this.parameters.ambientIntensity;
    }

    getStateProgress(time, range) {
        if (range.start < range.end) {
            return (time - range.start) / (range.end - range.start);
        } else {
            // 处理跨午夜的情况
            const duration = (24 - range.start) + range.end;
            const progress = time >= range.start
                ? (time - range.start) / duration
                : ((24 - range.start) + time) / duration;
            return progress;
        }
    }

    lerp(start, end, alpha) {
        return start + (end - start) * alpha;
    }

    // 添加到GUI控制面板
    addGUI(gui) {
        const folder = gui.addFolder('Day/Night Cycle');
        // 创建并存储时间控制器
        this.timeController = folder.add(this.parameters, 'time', 0, 24, 0.1)
            .name('Current Time')
            .onChange(() => {
                this.updateSunPosition();
                this.updateSkyParameters();
                this.updateLightIntensity();
            });
        folder.add(this.parameters, 'cycleSpeed', 0, 1, 0.01)
            .name('Cycle Speed');
        folder.add(this.parameters, 'autoRotate')
            .name('Auto Rotate');
        // 创建天空控制子文件夹
        const skySubfolder = folder.addFolder('Sky Parameters');
        skySubfolder.add(this.parameters, 'turbidity', 0, 20, 0.1)
            .name('Turbidity')
            .onChange(() => {
                this.updateSkyUniforms();
            });
        skySubfolder.add(this.parameters, 'rayleigh', 0, 4, 0.1)
            .name('Rayleigh')
            .onChange(() => {
                this.updateSkyUniforms();
            });
        skySubfolder.add(this.parameters, 'mieCoefficient', 0, 0.1, 0.001)
            .name('Mie Coefficient')
            .onChange(() => {
                this.updateSkyUniforms();
            });
        skySubfolder.add(this.parameters, 'mieDirectionalG', 0, 1, 0.01)
            .name('Mie Direction')
            .onChange(() => {
                this.updateSkyUniforms();
            });

        // 创建光照控制子文件夹
        const lightSubfolder = folder.addFolder('Light Parameters');
        lightSubfolder.add(this.parameters, 'exposure', 0, 1, 0.01)
            .name('Exposure')
            .onChange(() => {
                if (renderer) {
                    renderer.toneMappingExposure = this.parameters.exposure;
                }
            });
        lightSubfolder.add(this.parameters, 'sunIntensity', 0, 2, 0.1)
            .name('Sun Intensity')
            .onChange(() => {
                if (this.sunLight) {
                    this.sunLight.intensity = this.parameters.sunIntensity;
                }
            });
        lightSubfolder.add(this.parameters, 'ambientIntensity', 0, 1, 0.1)
            .name('Ambient Intensity')
            .onChange(() => {
                if (this.ambientLight) {
                    this.ambientLight.intensity = this.parameters.ambientIntensity;
                }
            });
        return folder;
    }
}

// 创建并配置天空和太阳
function setupSkyAndSun() {
    const sky = new Sky();
    sky.scale.setScalar(2000); 
    // 设置天空材质的uniforms，使用更动态的初始值
    const uniforms = sky.material.uniforms;
    uniforms.turbidity.value = 2;      // 降低初始浑浊度
    uniforms.rayleigh.value = 1;       // 降低瑞利散射
    uniforms.mieCoefficient.value = 0.005;
    uniforms.mieDirectionalG.value = 0.8;

    // 创建太阳光源
    // const sunLight = new THREE.DirectionalLight(COLORS.AMBIENT, 1);
    // sunLight.castShadow = true;
    // sunLight.shadow.mapSize.width = 2048;
    // sunLight.shadow.mapSize.height = 2048;
    // sunLight.shadow.camera.near = 0.5;
    // sunLight.shadow.camera.far = 500;
    // sunLight.shadow.camera.left = -200;
    // sunLight.shadow.camera.right = 200;
    // sunLight.shadow.camera.top = 200;
    // sunLight.shadow.camera.bottom = -200;
    // sunLight.position.set(0, 100, 0);

    // 修改太阳光源的设置
    const sunLight = new THREE.DirectionalLight(COLORS.AMBIENT, 1);
    sunLight.castShadow = true;
    // 提高阴影贴图精度
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    // 调整阴影相机范围，使其更贴近迷宫实际大小
    const shadowSize = MAZE_CONFIG.CELL_SIZE * mazeLayout.length;
    sunLight.shadow.camera.left = -shadowSize / 2;
    sunLight.shadow.camera.right = shadowSize / 2;
    sunLight.shadow.camera.top = shadowSize / 2;
    sunLight.shadow.camera.bottom = -shadowSize / 2;
    // 调整近平面和远平面
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 1000;
    // 添加阴影模糊
    sunLight.shadow.radius = 2;
    // 优化阴影偏差值，避免阴影失真
    sunLight.shadow.bias = -0.001;
    // 创建环境光，降低初始强度使得日夜变化更明显
    const ambientLight = new THREE.AmbientLight(COLORS.AMBIENT, 0.2);
    // 修改渲染器设置以增强效果
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    renderer.outputEncoding = THREE.sRGBEncoding;
    // 创建昼夜循环系统
    const dayNightSystem = new DayNightSystem(scene, sunLight, sky, ambientLight);
    // 初始化太阳位置为早晨
    dayNightSystem.parameters.time = 8;
    dayNightSystem.parameters.cycleSpeed = 0.2; // 增加循环速度使变化更明显
    dayNightSystem.updateSunPosition();
    dayNightSystem.updateSkyParameters();
    dayNightSystem.updateLightIntensity();
    // 添加到GUI面板
    const folder = dayNightSystem.addGUI(gui);
    folder.open(); // 默认展开控制面板
    // 创建阴影相机的辅助显示（调试用）
    const helper = new THREE.CameraHelper(sunLight.shadow.camera);
    scene.add(helper);
    return { sky, sunLight, ambientLight, dayNightSystem };
}

//玩家 或者说 小机器人
class Player {
    constructor() {
        this.materials = [];
        // 创建机器人组
        this.mesh = new THREE.Group();
        // 材质定义
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4682B4,  // 钢青色机身
            metalness: 0.7,
            roughness: 0.3,
        });
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0x00FFFF,  // 青色眼睛
            emissive: 0x00FFFF,
            emissiveIntensity: 0.5,
            metalness: 1,
            roughness: 0.2
        });
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,  // 银色细节
            metalness: 0.8,
            roughness: 0.2
        });
        // 收集所有材质
        this.materials.push(bodyMaterial, eyeMaterial, detailMaterial);
        // 身体部件
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(GAME_CONFIG.PLAYER.RADIUS,
                GAME_CONFIG.PLAYER.RADIUS * 1.2,
                GAME_CONFIG.PLAYER.HEIGHT * 0.6, 8),
            bodyMaterial
        );
        body.position.y = GAME_CONFIG.PLAYER.HEIGHT * 0.3;
        // 头部
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(GAME_CONFIG.PLAYER.RADIUS * 1.2, 8, 8),
            bodyMaterial
        );
        head.position.y = GAME_CONFIG.PLAYER.HEIGHT * 0.6 + GAME_CONFIG.PLAYER.RADIUS;
        // 眼睛
        const eyeGeometry = new THREE.SphereGeometry(GAME_CONFIG.PLAYER.RADIUS * 0.3, 16, 16);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-GAME_CONFIG.PLAYER.RADIUS * 0.5,
            GAME_CONFIG.PLAYER.HEIGHT * 0.6 + GAME_CONFIG.PLAYER.RADIUS * 1.2,
            GAME_CONFIG.PLAYER.RADIUS * 0.8);
        rightEye.position.set(GAME_CONFIG.PLAYER.RADIUS * 0.5,
            GAME_CONFIG.PLAYER.HEIGHT * 0.6 + GAME_CONFIG.PLAYER.RADIUS * 1.2,
            GAME_CONFIG.PLAYER.RADIUS * 0.8);
        // 天线
        const antennaGeometry = new THREE.CylinderGeometry(
            GAME_CONFIG.PLAYER.RADIUS * 0.1,
            GAME_CONFIG.PLAYER.RADIUS * 0.1,
            GAME_CONFIG.PLAYER.RADIUS * 1.5,
            8
        );
        const leftAntenna = new THREE.Mesh(antennaGeometry, detailMaterial);
        const rightAntenna = new THREE.Mesh(antennaGeometry, detailMaterial);
        leftAntenna.position.set(-GAME_CONFIG.PLAYER.RADIUS * 0.6,
            GAME_CONFIG.PLAYER.HEIGHT * 0.6 + GAME_CONFIG.PLAYER.RADIUS * 2, 0);
        rightAntenna.position.set(GAME_CONFIG.PLAYER.RADIUS * 0.6,
            GAME_CONFIG.PLAYER.HEIGHT * 0.6 + GAME_CONFIG.PLAYER.RADIUS * 2, 0);
        // 装饰环
        const ringGeometry = new THREE.TorusGeometry(
            GAME_CONFIG.PLAYER.RADIUS * 1.1,
            GAME_CONFIG.PLAYER.RADIUS * 0.1,
            8,
            24
        );
        const ring = new THREE.Mesh(ringGeometry, detailMaterial);
        ring.position.y = GAME_CONFIG.PLAYER.HEIGHT * 0.3;
        ring.rotation.x = Math.PI / 2;
        // 组装机器人
        this.mesh.add(body);
        this.mesh.add(head);
        this.mesh.add(leftEye);
        this.mesh.add(rightEye);
        this.mesh.add(leftAntenna);
        this.mesh.add(rightAntenna);
        this.mesh.add(ring);
        // 添加光晕效果
        const glowGeometry = new THREE.SphereGeometry(GAME_CONFIG.PLAYER.RADIUS * 1.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4682B4,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = GAME_CONFIG.PLAYER.HEIGHT * 0.3;
        this.mesh.add(glow);
        // 设置初始位置
        this.mesh.position.set(
            GAME_CONFIG.START.x,
            -MAZE_CONFIG.WALL_HEIGHT / 2 + 5,
            GAME_CONFIG.START.z
        );
        // 为整个模型启用阴影
        this.mesh.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        // 添加聚光灯跟随玩家
        this.spotlight = new THREE.SpotLight(0xffffff, 1);
        this.spotlight.position.set(0, 100, 0);
        this.spotlight.angle = Math.PI / 6;
        this.spotlight.penumbra = 0.1;
        this.spotlight.decay = 1;
        this.spotlight.distance = 200;
        this.spotlight.castShadow = true;
        // 玩家朝向角度,角度值，范围：-180~+180度 0度为z轴正半轴方向
        this.angle = 90;
        this.mesh.rotation.y = this.angle * (Math.PI / 180);
        // 添加动画状态
        this.animationState = {
            headBob: 0,
            antennaWave: 0
        };
        this.collisionBuffer = GAME_CONFIG.PLAYER.RADIUS * 1.0;
        // 材质收集
        this.mesh.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => this.materials.push(mat));
                } else {
                    this.materials.push(object.material);
                }
            }
        });
    }
    // 控制玩家模型的可见性
    setFirstPersonMode(enabled) {
            this.mesh.visible = !enabled;
    }
    animate() {
        // 头部上下摆动
        this.animationState.headBob += 0.1;
        const headBobOffset = Math.sin(this.animationState.headBob) * 2.0;
        this.mesh.children[1].position.y = GAME_CONFIG.PLAYER.HEIGHT * 0.6 +
            GAME_CONFIG.PLAYER.RADIUS + headBobOffset;
        // 天线摆动
        this.animationState.antennaWave += 0.15;
        const antennaWaveOffset = Math.sin(this.animationState.antennaWave) * 0.3; // 增加天线摆动幅度
        this.mesh.children[4].rotation.z = antennaWaveOffset;
        this.mesh.children[5].rotation.z = -antennaWaveOffset;
    }
    // 规范角度至-180~+180内
    normalizeAngle(angle) {
        let normalized = angle % 360;
        if (normalized > 180) {
            normalized -= 360;
        }
        return normalized;
    }
    // 更新函数
    update() {
        // 游戏暂停检查
        if (!gameState.isPlaying) return;
        const currentTime = Date.now();
        if (currentTime - keyState.lastMove < keyState.moveDelay) {
            return;
        }
        let moved = false;
        const speed = GAME_CONFIG.PLAYER.SPEED;
        // 处理前进移动
        if (keys.w || keys.ArrowUp) {
            moved = this.moveForward(speed);
        }
        // 处理转向
        else {
            moved = this.handleRotation();
        }
        // 如果发生移动或转向,更新相关状态
        if (moved) {
            keyState.lastMove = currentTime;
            this.updateSpotlight();
            //每次运动都检测是否到达终点
            this.reachEnd();
        }
    }
    moveForward(speed) {
        if (GAME_CONFIG.DEBUG) {
            console.log("Moving forward, current angle:", this.angle);
        }
        const directionVector = this.getDirectionVector();
        // 计算下一个位置
        const nextPosition = {
            x: this.mesh.position.x + directionVector.x * speed,
            z: this.mesh.position.z + directionVector.z * speed
        };
        // 检查碰撞
        if (this.checkCollision(nextPosition)) {
            return false; // 如果发生碰撞，不进行移动
        }
        // 如果没有碰撞，更新位置
        this.mesh.position.x = nextPosition.x;
        this.mesh.position.z = nextPosition.z;
        // 确保模型朝向与当前角度一致
        this.mesh.rotation.y = this.angle * (Math.PI / 180);
        if (GAME_CONFIG.DEBUG) {
            console.log("Robot face angle:", this.mesh.rotation.y / Math.PI * 180);
        }
        return true;
    }

    // 检查给定位置是否与任何墙壁发生碰撞
    checkCollision(position) {
        // 获取玩家在迷宫网格中的位置
        const gridX = Math.floor((position.x + MAZE_CONFIG.OFFSET) / MAZE_CONFIG.CELL_SIZE);
        const gridZ = Math.floor((position.z + MAZE_CONFIG.OFFSET) / MAZE_CONFIG.CELL_SIZE);
        // 检查周围的九个格子
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const checkX = gridX + i;
                const checkZ = gridZ + j;
                // 检查是否在迷宫范围内
                if (checkX >= 0 && checkX < mazeLayout[0].length &&
                    checkZ >= 0 && checkZ < mazeLayout.length) {
                    // 如果是墙壁，检查碰撞
                    if (mazeLayout[checkZ][checkX] === 1) {
                        // 计算墙壁的边界框
                        const wallBounds = {
                            minX: checkX * MAZE_CONFIG.CELL_SIZE - MAZE_CONFIG.OFFSET - MAZE_CONFIG.CELL_SIZE / 2,
                            maxX: checkX * MAZE_CONFIG.CELL_SIZE - MAZE_CONFIG.OFFSET + MAZE_CONFIG.CELL_SIZE / 2,
                            minZ: checkZ * MAZE_CONFIG.CELL_SIZE - MAZE_CONFIG.OFFSET - MAZE_CONFIG.CELL_SIZE / 2,
                            maxZ: checkZ * MAZE_CONFIG.CELL_SIZE - MAZE_CONFIG.OFFSET + MAZE_CONFIG.CELL_SIZE / 2
                        };
                        // 使用类的碰撞缓冲区属性进行检测
                        if (position.x + this.collisionBuffer > wallBounds.minX &&
                            position.x - this.collisionBuffer < wallBounds.maxX &&
                            position.z + this.collisionBuffer > wallBounds.minZ &&
                            position.z - this.collisionBuffer < wallBounds.maxZ) {
                            return true; // 发生碰撞
                        }
                    }
                }
            }
        }
        return false; // 没有碰撞
    }
   
    // 处理旋转逻辑
    handleRotation() {
        let rotated = false;
        for (const [key, angleChange] of Object.entries(ROTATION_ANGLES)) {
            if (keys[key]) {
                this.addAngle(angleChange);
                this.mesh.rotation.y = this.angle * (Math.PI / 180);
                if (GAME_CONFIG.DEBUG) {
                    console.log(`Rotation - Key: ${key}, Angle: ${this.angle}`);
                    console.log("Robot face angle:", this.mesh.rotation.y / Math.PI * 180);
                }
                rotated = true;
            }
        }
        return rotated;
    }

    // 更新聚光灯位置
    updateSpotlight() {
        this.spotlight.position.set(
            this.mesh.position.x,
            100,
            this.mesh.position.z
        );
    }

    addAngle(offset) {
        this.angle = this.normalizeAngle(this.angle + offset);
    }

    getDirectionVector() {
        const direction = new THREE.Vector3(
            Math.sin(this.angle * (Math.PI / 180)),
            0,
            Math.cos(this.angle * (Math.PI / 180))
        );
        return direction;
    }

    reset() {
        this.mesh.position.set(
            GAME_CONFIG.START.x,
            -MAZE_CONFIG.WALL_HEIGHT / 2 + 5,
            GAME_CONFIG.START.z
        );
    }

    reachEnd() {
        if (!gameState.isPlaying) return;
        // 检查玩家是否在终点格子内
        const endCellX = GAME_CONFIG.END.x;
        const endCellZ = GAME_CONFIG.END.z;
        // 获取玩家当前位置
        const playerX = this.mesh.position.x;
        const playerZ = this.mesh.position.z;
        // 计算玩家是否在终点格子范围内
        const halfCell = MAZE_CONFIG.CELL_SIZE / 2;       // 使用 CELL_SIZE/2 作为判定范围
        if (Math.abs(playerX - endCellX) <= halfCell &&
            Math.abs(playerZ - endCellZ) <= halfCell) {
            gameState.isPlaying = false;
            alert('恭喜完成！');
            this.reset();
        }
    }
    getDirectionData() {
        return {
            direction: this.getDirectionVector(),
            position: this.mesh.position.clone()
        };
    }
}

class CameraController {
    constructor(camera, controls, player) {
        this.camera = camera;
        this.controls = controls;
        this.player = player;
        // 相机模式：'orbit' 或 'follow'
        this.mode = 'follow';
        // 添加相机旋转角度属性
        this.rotation = {
            vertical: 0,   // 垂直旋转角度 (-90 到 90度)
            horizontal: 0  // 水平旋转角度 (-180 到 180度)
        };
        this.cameraParameters = {
            fov: 75,           // 稍微增大FOV以获得更好的空间感
            near: 0.1,
            far: 4000,
            distance: 0,       // 第一人称无需距离
            height: 20,        // 调整到玩家"眼睛"的高度
            smoothness: 0.15   // 适中的平滑度
        };
        // 使用默认值初始化参数
        this.cameraParameters = { ...DEFAULT_CAMERA_PARAMS };
        // 绑定事件监听器
        this.setupEventListeners();
        // 存储相机目标位置
        this.targetPosition = new THREE.Vector3();
    }

    setupEventListeners() {
        // 监听鼠标操作切换到轨道控制
        this.controls.domElement.addEventListener('mousedown', () => {
            if (!gameState.isPlaying) return;
            this.mode = 'orbit';
            this.player.setFirstPersonMode(false);  // 显示玩家模型
        });
        // 监听键盘操作切换到第一人称
        const validKeys = ['w', 's', 'a', 'd'];
        window.addEventListener('keydown', (e) => {
            if (!gameState.isPlaying) return;
            if (validKeys.includes(e.key)) {
                this.mode = 'follow';
                this.player.setFirstPersonMode(true);  // 隐藏玩家模型
            }
        });
    }

    // 处理方向键的视角调整
    handleArrowKeys() {
        const rotationAmount = this.cameraParameters.rotationSpeed;
        if (keys.ArrowUp) {
            this.rotation.vertical = Math.max(
                this.rotation.vertical - rotationAmount,
                -60  // 限制上仰角度
            );
        }
        if (keys.ArrowDown) {
            this.rotation.vertical = Math.min(
                this.rotation.vertical + rotationAmount,
                60   // 限制下俯角度
            );
        }
        if (keys.ArrowLeft) {
            this.rotation.horizontal += rotationAmount;
        }
        if (keys.ArrowRight) {
            this.rotation.horizontal -= rotationAmount;
        }
        // 规范化水平旋转角度到 -180 到 180 度
        if (this.rotation.horizontal > 180) this.rotation.horizontal -= 360;
        if (this.rotation.horizontal < -180) this.rotation.horizontal += 360;
    }

    update() {
        if (this.mode === 'follow' && gameState.isPlaying) {
            const playerData = this.player.getDirectionData();
            // 处理方向键的视角调整
            this.handleArrowKeys();
            // 设置相机位置
            this.camera.position.set(
                playerData.position.x,
                this.cameraParameters.height,
                playerData.position.z
            );
            // 计算基础视角方向（跟随机器人朝向）
            const baseDirection = new THREE.Vector3(
                playerData.direction.x,
                0,
                playerData.direction.z
            ).normalize();
            // 应用视角旋转
            const lookAtPoint = new THREE.Vector3();
            const verticalRotation = THREE.MathUtils.degToRad(this.rotation.vertical);
            const horizontalRotation = THREE.MathUtils.degToRad(this.rotation.horizontal);
            // 创建四元数来处理旋转
            const quaternion = new THREE.Quaternion();
            quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), horizontalRotation);
            baseDirection.applyQuaternion(quaternion);
            // 计算最终的观察点
            lookAtPoint.copy(this.camera.position).add(
                new THREE.Vector3(
                    baseDirection.x * Math.cos(verticalRotation),
                    -Math.sin(verticalRotation),
                    baseDirection.z * Math.cos(verticalRotation)
                ).multiplyScalar(100)
            );
            // 平滑插值转向
            const currentLookAt = new THREE.Vector3();
            this.camera.getWorldDirection(currentLookAt);
            const targetLookAt = lookAtPoint.clone().sub(this.camera.position).normalize();
            currentLookAt.lerp(targetLookAt, this.cameraParameters.smoothness);
            this.camera.lookAt(
                this.camera.position.x + currentLookAt.x * 100,
                this.camera.position.y + currentLookAt.y * 100,
                this.camera.position.z + currentLookAt.z * 100
            );
        } else if (this.mode === 'orbit') {
            this.controls.update();
        }
    }

    setMode(mode) {
        this.mode = mode;
        if (mode === 'orbit') {
            this.controls.enabled = true;
            this.player.setFirstPersonMode(false); // 显示玩家模型
        } else if (mode === 'follow') {
            this.player.setFirstPersonMode(true);  // 隐藏玩家模型
            // 重置视角旋转
            this.rotation.vertical = 0;
            this.rotation.horizontal = 0;
        }
    }
}

function updateCameraSettings() {
    camera.fov = cameraController.cameraParameters.fov;
    camera.near = cameraController.cameraParameters.near;
    camera.far = cameraController.cameraParameters.far;
    camera.distance = cameraController.cameraParameters.distance;
    camera.height = cameraController.cameraParameters.height;
    camera.updateProjectionMatrix();
}

function initializeCameraController(camera, controls, player) {
    const cameraController = new CameraController(camera, controls, player);
    // 创建GUI控制面板
    const cameraFolder = gui.addFolder('Camera Settings');
    // 为每个参数添加控制器
    for (const [key, defaultValue] of Object.entries(DEFAULT_CAMERA_PARAMS)) {
        cameraFolder.add(cameraController.cameraParameters, key, {
            'fov': [30, 90],
            'near': [0.1, 10],
            'far': [100, 5000],
            'height': [5, 100],
            'smoothness': [0.01, 1],
            'rotationSpeed': [0.1, 5]
        }[key][0], {
            'fov': [30, 90],
            'near': [0.1, 10],
            'far': [100, 5000],
            'height': [5, 100],
            'smoothness': [0.01, 1],
            'rotationSpeed': [0.1, 5]
        }[key][1])
            .name(key)
            .onChange(value => {
                if (['fov', 'near', 'far', 'height'].includes(key)) {
                    updateCameraSettings();
                }
            });
    }
    return cameraController;
}

// ===== UI创建 =====
function createUI() {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '20px';
    container.style.left = '20px';
    container.style.color = 'white';
    container.style.fontFamily = 'Arial';
    container.style.fontSize = '20px';
    container.innerHTML = `
        <div style="margin-top: 40px;">
            <button id="start-btn" style="padding: 10px; font-size: 16px;">开始</button>
            <button id="reset-btn" style="padding: 10px; font-size: 16px; margin-left: 10px;">重来</button>
        </div>
    `;
    document.body.appendChild(container);

    // 添加按钮事件
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
}

// ===== 游戏控制函数 =====
function startGame() {
    console.log('Game Started');
    player.reset();
    gameState.isPlaying = true;

    // 设置相机初始位置，并切换到跟随模式
    camera.position.set(0, 200, 200);
    cameraController.setMode('follow');
    controls.update();
}

function resetGame() {
    // 重置游戏状态
    gameState.isPlaying = false;
    gameState.isPaused = false;

    // 重置玩家状态
    player.reset();
    player.angle = 90; // 重置玩家朝向角度
    player.mesh.rotation.y = player.angle * (Math.PI / 180);
    player.setFirstPersonMode(false); // 显示玩家模型
    player.animationState = { headBob: 0, antennaWave: 0 }; // 重置动画状态

    // 重置相机控制器状态
    cameraController.mode = 'follow';
    cameraController.rotation.vertical = 0;   // 重置垂直旋转
    cameraController.rotation.horizontal = 0; // 重置水平旋转

    // 重置相机位置和朝向
    camera.position.set(0, 200, 200);
    camera.lookAt(0, 0, 0);

    // 重置轨道控制器
    controls.reset();
    controls.update();

    // 重置键盘状态
    for (let key in keys) {
        keys[key] = false;
    }
    keyState.lastMove = 0;

    // 重置玩家聚光灯位置
    player.updateSpotlight();
}

// ===== 创建起点和终点标记 =====
function createMarkers() {
    // 使用与迷宫格子完全相同大小的几何体
    const markerGeometry = new THREE.PlaneGeometry(
        MAZE_CONFIG.CELL_SIZE,
        MAZE_CONFIG.CELL_SIZE
    );

    // 起点材质（亮绿色，更高的发光强度）
    const startMaterial = new THREE.MeshStandardMaterial({
        color: 0x00FF00,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        emissive: 0x00FF00,
        emissiveIntensity: 0.8,
        metalness: 0.5,
        roughness: 0.2
    });

    // 终点材质（亮红色，更高的发光强度）
    const endMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF0000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        emissive: 0xFF0000,
        emissiveIntensity: 0.8,
        metalness: 0.5,
        roughness: 0.2
    });

    // 创建起点标记
    const startMarker = new THREE.Mesh(markerGeometry, startMaterial);
    startMarker.position.set(
        GAME_CONFIG.START.x,
        -MAZE_CONFIG.WALL_HEIGHT / 2 + 0.2,
        GAME_CONFIG.START.z
    );
    startMarker.rotation.x = -Math.PI / 2;

    // 创建终点标记
    const endMarker = new THREE.Mesh(markerGeometry, endMaterial);
    endMarker.position.set(
        GAME_CONFIG.END.x,
        -MAZE_CONFIG.WALL_HEIGHT / 2 + 0.2,
        GAME_CONFIG.END.z
    );
    endMarker.rotation.x = -Math.PI / 2;

    // 创建发光效果
    const startGlowMeshes = createGlowMesh(startMarker, 0x00FF00);
    const endGlowMeshes = createGlowMesh(endMarker, 0xFF0000);

    // 返回所有网格
    return [
        startMarker,
        endMarker,
        ...startGlowMeshes,
        ...endGlowMeshes
    ];
}

// 创建发光效果
function createGlowMesh(baseMesh, color) {
    const glowMeshes = [];

    // 第一层：与格子大小完全相同的主发光
    const mainGlowGeometry = new THREE.PlaneGeometry(
        MAZE_CONFIG.CELL_SIZE,
        MAZE_CONFIG.CELL_SIZE
    );
    const mainGlowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    const mainGlow = new THREE.Mesh(mainGlowGeometry, mainGlowMaterial);
    mainGlow.position.copy(baseMesh.position);
    mainGlow.rotation.copy(baseMesh.rotation);
    mainGlow.position.y += 0.2;
    glowMeshes.push(mainGlow);

    // 第二层：稍小一点的强光层
    const innerGlowGeometry = new THREE.PlaneGeometry(
        MAZE_CONFIG.CELL_SIZE * 0.9,
        MAZE_CONFIG.CELL_SIZE * 0.9
    );
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    innerGlow.position.copy(baseMesh.position);
    innerGlow.rotation.copy(baseMesh.rotation);
    innerGlow.position.y += 0.3;
    glowMeshes.push(innerGlow);

    return glowMeshes;
}

// ===== GUI控制面板初始化 =====
const gui = new GUI();
gui.domElement.style.right = '0px';
gui.domElement.style.width = '300px';

// 场景组装
// 添加地面
scene.add(createFloor());
// 添加迷宫
const mazeObject = createMaze();
scene.add(mazeObject);
// 添加光照系统
const { sky, sunLight, ambientLight, dayNightSystem } = setupSkyAndSun();
scene.add(sky);
scene.add(sunLight);
scene.add(ambientLight);
dayNightSystem.update();
// 控制器设置
const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', () => { });

// ===== 初始化游戏 =====
const player = new Player();
const cameraController = initializeCameraController(camera, controls, player);
scene.add(player.mesh);
scene.add(player.spotlight);

// 创建并添加起点和终点标记
const markers = createMarkers();
markers.forEach(marker => scene.add(marker));

createUI();

//动画循环
function animate() {
    dayNightSystem.update();// 使用光照控制器来更新所有光照
    player.animate();//控制玩家的摆动动画
    if (gameState.isPlaying) {
        player.update(mazeObject.children);
        cameraController.update(); // 使用相机控制器来更新相机
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

//窗口大小跨设备自适应
window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
})

