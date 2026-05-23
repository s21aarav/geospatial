import sys
import json
import cv2
import numpy as np
import os

def extract_polygon():
    input_data = sys.stdin.read()
    if not input_data:
        return
    
    try:
        results = json.loads(input_data)
    except:
        return
    
    data_dir = os.getenv("DATA_DIR", "./data")
    base_dir = os.path.join(data_dir, "eurosat", "web")
    
    for res in results:
        cat = res.get('category', '')
        fname = res.get('filename', '')
        lat = res.get('lat', 0.0)
        lon = res.get('lon', 0.0)
        
        path = os.path.join(base_dir, cat, fname)
        polygon = []
        if os.path.exists(path):
            img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
            if img is not None:
                # Apply Gaussian Blur to reduce noise
                blurred = cv2.GaussianBlur(img, (5, 5), 0)
                # Apply Canny Edge Detection
                edges = cv2.Canny(blurred, 50, 150)
                # Dilate to connect edges
                kernel = np.ones((3,3), np.uint8)
                dilated = cv2.dilate(edges, kernel, iterations=1)
                
                # Find contours
                contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    # Get largest contour
                    largest = max(contours, key=cv2.contourArea)
                    
                    # Simplify contour slightly
                    epsilon = 0.005 * cv2.arcLength(largest, True)
                    approx = cv2.approxPolyDP(largest, epsilon, True)
                    
                    # Minimum of 3 points required for a polygon
                    if len(approx) >= 3:
                        for pt in approx:
                            x, y = pt[0]
                            # EuroSAT images are 64x64. 10m per pixel.
                            # center is (32, 32). 
                            # 10m is roughly 0.00009 degrees.
                            point_lat = lat + (32 - y) * 0.00009
                            point_lon = lon + (x - 32) * 0.00009
                            polygon.append([point_lat, point_lon])
        
        # If no polygon found, image missing, or contour too small, just make a basic targeting bracket box
        if not polygon:
            d = 0.002
            polygon = [
                [lat + d, lon - d],
                [lat + d, lon + d],
                [lat - d, lon + d],
                [lat - d, lon - d]
            ]
            
        res['targetPolygon'] = polygon
        
    print(json.dumps(results))

if __name__ == '__main__':
    extract_polygon()
