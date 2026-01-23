export interface CalibrationData {
  xrPosition: [number, number, number];
  xrRotation: [number, number, number];
  homePosition: [number, number, number];
  homeRotation: [number, number, number];
  timestamp: number;
  version: number;
}

export interface CalibrationResult {
  success: boolean;
  calibration?: CalibrationData;
  error?: string;
}

const STORAGE_PREFIX = 'homeCalibration_';
const CALIBRATION_VERSION = 1;

export class HomeCalibrationManager {
  private static instance: HomeCalibrationManager | null = null;

  private constructor() {}

  static getInstance(): HomeCalibrationManager {
    if (!HomeCalibrationManager.instance) {
      HomeCalibrationManager.instance = new HomeCalibrationManager();
    }
    return HomeCalibrationManager.instance;
  }

  private getStorageKey(homeId: string): string {
    return `${STORAGE_PREFIX}${homeId}`;
  }

  hasCalibration(homeId: string): boolean {
    try {
      const key = this.getStorageKey(homeId);
      const stored = localStorage.getItem(key);
      if (!stored) return false;

      const data = JSON.parse(stored) as CalibrationData;
      return (
        data.version === CALIBRATION_VERSION &&
        Array.isArray(data.xrPosition) &&
        Array.isArray(data.xrRotation) &&
        Array.isArray(data.homePosition) &&
        Array.isArray(data.homeRotation)
      );
    } catch {
      return false;
    }
  }

  loadCalibration(homeId: string): CalibrationResult {
    try {
      const key = this.getStorageKey(homeId);
      const stored = localStorage.getItem(key);

      if (!stored) {
        return {
          success: false,
          error: 'No calibration found for this home',
        };
      }

      const data = JSON.parse(stored) as CalibrationData;

      if (data.version !== CALIBRATION_VERSION) {
        return {
          success: false,
          error: 'Calibration data version mismatch - recalibration required',
        };
      }

      return {
        success: true,
        calibration: data,
      };
    } catch (error) {
      console.error('[HomeCalibrationManager] Error loading calibration:', error);
      return {
        success: false,
        error: 'Failed to load calibration data',
      };
    }
  }

  saveCalibration(
    homeId: string,
    currentXRPosition: [number, number, number],
    currentXRRotation: [number, number, number],
    homePosition: [number, number, number],
    homeRotation: [number, number, number]
  ): CalibrationResult {
    try {
      const calibrationData: CalibrationData = {
        xrPosition: currentXRPosition,
        xrRotation: currentXRRotation,
        homePosition: homePosition,
        homeRotation: homeRotation,
        timestamp: Date.now(),
        version: CALIBRATION_VERSION,
      };

      const key = this.getStorageKey(homeId);
      localStorage.setItem(key, JSON.stringify(calibrationData));

      console.log(`[HomeCalibrationManager] Saved calibration for home ${homeId}:`, calibrationData);

      return {
        success: true,
        calibration: calibrationData,
      };
    } catch (error) {
      console.error('[HomeCalibrationManager] Error saving calibration:', error);
      return {
        success: false,
        error: 'Failed to save calibration data',
      };
    }
  }

  deleteCalibration(homeId: string): boolean {
    try {
      const key = this.getStorageKey(homeId);
      localStorage.removeItem(key);
      console.log(`[HomeCalibrationManager] Deleted calibration for home ${homeId}`);
      return true;
    } catch (error) {
      console.error('[HomeCalibrationManager] Error deleting calibration:', error);
      return false;
    }
  }

  calculateHomeTransform(
    calibration: CalibrationData,
    currentXRPosition: [number, number, number],
    currentXRRotation: [number, number, number]
  ): { position: [number, number, number]; rotation: [number, number, number] } {
    // Calculate the difference between current XR position and calibration XR position
    const positionDiff: [number, number, number] = [
      currentXRPosition[0] - calibration.xrPosition[0],
      currentXRPosition[1] - calibration.xrPosition[1],
      currentXRPosition[2] - calibration.xrPosition[2],
    ];

    // Calculate the rotation difference (only Y-axis for horizontal orientation)
    const rotationDiff: [number, number, number] = [
      0,
      currentXRRotation[1] - calibration.xrRotation[1],
      0,
    ];

    // Apply the offset to the home model's calibrated position
    const newHomePosition: [number, number, number] = [
      calibration.homePosition[0] + positionDiff[0],
      calibration.homePosition[1],
      calibration.homePosition[2] + positionDiff[2],
    ];

    // Apply the rotation offset to the home model
    const newHomeRotation: [number, number, number] = [
      calibration.homeRotation[0],
      calibration.homeRotation[1] + rotationDiff[1],
      calibration.homeRotation[2],
    ];

    return {
      position: newHomePosition,
      rotation: newHomeRotation,
    };
  }

  transformFurniturePosition(
    furnitureLocalPosition: [number, number, number],
    oldHomePosition: [number, number, number],
    oldHomeRotation: [number, number, number],
    newHomePosition: [number, number, number],
    newHomeRotation: [number, number, number]
  ): [number, number, number] {
    
    // Calculate the position relative to old home position
    const relativePos: [number, number, number] = [
      furnitureLocalPosition[0] - oldHomePosition[0],
      furnitureLocalPosition[1] - oldHomePosition[1],
      furnitureLocalPosition[2] - oldHomePosition[2],
    ];

    // Apply rotation difference
    const rotDiff = newHomeRotation[1] - oldHomeRotation[1];
    const cosR = Math.cos(rotDiff);
    const sinR = Math.sin(rotDiff);

    const rotatedX = relativePos[0] * cosR - relativePos[2] * sinR;
    const rotatedZ = relativePos[0] * sinR + relativePos[2] * cosR;

    // Apply to new home position
    return [
      newHomePosition[0] + rotatedX,
      newHomePosition[1] + relativePos[1],
      newHomePosition[2] + rotatedZ,
    ];
  }


  getAllCalibratedHomes(): string[] {
    const homes: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          homes.push(key.replace(STORAGE_PREFIX, ''));
        }
      }
    } catch (error) {
      console.error('[HomeCalibrationManager] Error getting calibrated homes:', error);
    }
    return homes;
  }

  clearAllCalibrations(): void {
    try {
      const homes = this.getAllCalibratedHomes();
      homes.forEach((homeId) => {
        this.deleteCalibration(homeId);
      });
      console.log('[HomeCalibrationManager] Cleared all calibration data');
    } catch (error) {
      console.error('[HomeCalibrationManager] Error clearing calibrations:', error);
    }
  }
}

export default HomeCalibrationManager;

