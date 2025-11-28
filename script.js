const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let points = [];
let centroids = [];
let k = 3;
let animationSpeed = 500;
let isRunning = false;
let iterations = 0;
let totalIterations = 0;

const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B500', '#6C5CE7'
];

function updateKValue(value) {
    k = parseInt(value);
    document.getElementById('kDisplay').textContent = value;
}

function updateSpeed(value) {
    animationSpeed = parseInt(value);
    document.getElementById('speedDisplay').textContent = value;
}

function updateSpread(value) {
    document.getElementById('spreadDisplay').textContent = value;
}

function generateRandomPoints() {
    if (isRunning) return;
    
    const count = parseInt(document.getElementById('sampleCount').value);
    const pattern = document.getElementById('distributionPattern').value;
    const spread = parseInt(document.getElementById('spreadAmount').value);
    
    points = [];
    const padding = 50;
    const width = canvas.width - 2 * padding;
    const height = canvas.height - 2 * padding;
    
    switch(pattern) {
        case 'scattered':
            const numClusters = Math.floor(Math.random() * 3) + 3;
            const pointsPerCluster = Math.floor(count / numClusters);
            
            for (let i = 0; i < numClusters; i++) {
                const centerX = padding + Math.random() * width;
                const centerY = padding + Math.random() * height;
                
                for (let j = 0; j < pointsPerCluster; j++) {
                    const angle = Math.random() * 2 * Math.PI;
                    const radius = Math.random() * spread;
                    
                    const x = Math.max(padding, Math.min(canvas.width - padding, 
                        centerX + radius * Math.cos(angle)));
                    const y = Math.max(padding, Math.min(canvas.height - padding, 
                        centerY + radius * Math.sin(angle)));
                    
                    points.push({ x, y, cluster: -1 });
                }
            }
            break;
            
        case 'gaussian':
            const gaussClusters = Math.floor(Math.random() * 2) + 3;
            const gaussPointsPerCluster = Math.floor(count / gaussClusters);
            
            for (let i = 0; i < gaussClusters; i++) {
                const centerX = padding + Math.random() * width;
                const centerY = padding + Math.random() * height;
                const stdDev = spread / 3;
                
                for (let j = 0; j < gaussPointsPerCluster; j++) {
                    const u1 = Math.random();
                    const u2 = Math.random();
                    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
                    
                    const x = Math.max(padding, Math.min(canvas.width - padding, 
                        centerX + z0 * stdDev));
                    const y = Math.max(padding, Math.min(canvas.height - padding, 
                        centerY + z1 * stdDev));
                    
                    points.push({ x, y, cluster: -1 });
                }
            }
            break;
            
        case 'circular':
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const maxRadius = Math.min(width, height) / 2 - padding;
            
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.sqrt(Math.random()) * maxRadius * (spread / 150);
                
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                
                points.push({ x, y, cluster: -1 });
            }
            break;
            
        case 'grid':
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            const cellWidth = width / cols;
            const cellHeight = height / rows;
            const jitter = spread / 2;
            
            for (let i = 0; i < count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                
                const x = padding + col * cellWidth + cellWidth / 2 + 
                    (Math.random() - 0.5) * jitter;
                const y = padding + row * cellHeight + cellHeight / 2 + 
                    (Math.random() - 0.5) * jitter;
                
                points.push({ 
                    x: Math.max(padding, Math.min(canvas.width - padding, x)),
                    y: Math.max(padding, Math.min(canvas.height - padding, y)),
                    cluster: -1 
                });
            }
            break;
            
        case 'random':
        default:
            for (let i = 0; i < count; i++) {
                points.push({
                    x: padding + Math.random() * width,
                    y: padding + Math.random() * height,
                    cluster: -1
                });
            }
    }
    
    centroids = [];
    iterations = 0;
    updateStats();
    draw();
}

function initializeCentroids() {
    if (points.length === 0) {
        alert('لطفاً ابتدا نقاط را تولید کنید!');
        return;
    }
    
    centroids = [];
    
    const firstIndex = Math.floor(Math.random() * points.length);
    centroids.push({ ...points[firstIndex] });
    
    for (let i = 1; i < k; i++) {
        let maxDist = -1;
        let farthestPoint = null;
        
        for (let point of points) {
            let minDistToCentroid = Infinity;
            
            for (let centroid of centroids) {
                const dist = distance(point, centroid);
                minDistToCentroid = Math.min(minDistToCentroid, dist);
            }
            
            if (minDistToCentroid > maxDist) {
                maxDist = minDistToCentroid;
                farthestPoint = { ...point };
            }
        }
        
        centroids.push(farthestPoint);
    }
    
    points.forEach(point => point.cluster = -1);
    iterations = 0;
    updateStats();
    draw();
    
    document.getElementById('convergenceStatus').textContent = 'مراکز مقداردهی شدند - آماده اجرا';
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function assignClusters() {
    let changed = false;
    
    points.forEach(point => {
        let minDist = Infinity;
        let newCluster = -1;
        
        centroids.forEach((centroid, index) => {
            const dist = distance(point, centroid);
            if (dist < minDist) {
                minDist = dist;
                newCluster = index;
            }
        });
        
        if (point.cluster !== newCluster) {
            changed = true;
            point.cluster = newCluster;
        }
    });
    
    return changed;
}

function updateCentroids() {
    const newCentroids = [];
    
    for (let i = 0; i < k; i++) {
        const clusterPoints = points.filter(p => p.cluster === i);
        
        if (clusterPoints.length > 0) {
            const sumX = clusterPoints.reduce((sum, p) => sum + p.x, 0);
            const sumY = clusterPoints.reduce((sum, p) => sum + p.y, 0);
            
            newCentroids.push({
                x: sumX / clusterPoints.length,
                y: sumY / clusterPoints.length
            });
        } else {
            newCentroids.push({ ...centroids[i] });
        }
    }
    
    centroids = newCentroids;
}

async function runKMeans() {
    if (isRunning) return;
    
    if (centroids.length === 0) {
        alert('لطفاً ابتدا مراکز را مقداردهی کنید!');
        return;
    }
    
    isRunning = true;
    iterations = 0;
    totalIterations = 0;
    
    document.getElementById('convergenceStatus').textContent = 'در حال اجرا...';
    
    let maxIterations = 100;
    let converged = false;
    
    while (!converged && iterations < maxIterations) {
        iterations++;
        totalIterations++;
        
        const changed = assignClusters();
        draw();
        await sleep(animationSpeed);
        
        updateCentroids();
        draw();
        await sleep(animationSpeed);
        
        if (!changed) {
            converged = true;
        }
        
        updateStats();
    }
    
    if (converged) {
        document.getElementById('convergenceStatus').textContent = 
            `✅ همگرا شد در ${totalIterations} تکرار`;
        document.getElementById('convergenceStatus').style.background = '#d4edda';
        document.getElementById('convergenceStatus').style.borderColor = '#28a745';
        document.getElementById('convergenceStatus').style.color = '#155724';
    } else {
        document.getElementById('convergenceStatus').textContent = 
            `⚠️ به حداکثر تکرار رسید (${maxIterations})`;
        document.getElementById('convergenceStatus').style.background = '#fff3cd';
        document.getElementById('convergenceStatus').style.borderColor = '#ffc107';
        document.getElementById('convergenceStatus').style.color = '#856404';
    }
    
    isRunning = false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    points.forEach(point => {
        if (point.cluster !== -1 && centroids[point.cluster]) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(centroids[point.cluster].x, centroids[point.cluster].y);
            ctx.strokeStyle = colors[point.cluster] + '26';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });
    
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = point.cluster !== -1 ? colors[point.cluster] : '#95a5a6';
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
    
    centroids.forEach((centroid, index) => {
        ctx.beginPath();
        ctx.arc(centroid.x, centroid.y, 12, 0, 2 * Math.PI);
        ctx.fillStyle = colors[index];
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', centroid.x, centroid.y);
    });
}

function updateStats() {
    document.getElementById('pointCount').textContent = points.length;
    document.getElementById('centroidCount').textContent = centroids.length;
    document.getElementById('iterationCount').textContent = iterations;
    document.getElementById('totalIterations').textContent = totalIterations;
}

function reset() {
    if (isRunning) return;
    
    points = [];
    centroids = [];
    iterations = 0;
    totalIterations = 0;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateStats();
    
    document.getElementById('convergenceStatus').textContent = 'آماده شروع';
    document.getElementById('convergenceStatus').style.background = '#fff3cd';
    document.getElementById('convergenceStatus').style.borderColor = '#ffc107';
    document.getElementById('convergenceStatus').style.color = '#856404';
}

canvas.addEventListener('click', (e) => {
    if (isRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    points.push({ x, y, cluster: -1 });
    updateStats();
    draw();
});

updateStats();
