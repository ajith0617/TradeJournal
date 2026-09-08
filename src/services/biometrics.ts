import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics({allowDeviceCredentials: false});

export type BiometricAvailability = {
  available: boolean;
  biometryType?: string;
  error?: string;
};

export async function checkBiometrics(): Promise<BiometricAvailability> {
  try {
    const {available, biometryType, error} =
      await rnBiometrics.isSensorAvailable();
    return {
      available,
      biometryType: biometryType ? String(biometryType) : undefined,
      error,
    };
  } catch (e) {
    return {
      available: false,
      error: e instanceof Error ? e.message : 'Biometrics unavailable',
    };
  }
}

export async function promptFingerprint(
  promptMessage = 'Verify fingerprint to open Journal',
): Promise<{success: boolean; error?: string}> {
  try {
    const {available, error: availError} = await checkBiometrics();
    if (!available) {
      return {
        success: false,
        error:
          availError ||
          'No fingerprint enrolled. Set up a fingerprint in phone settings.',
      };
    }

    const {success, error} = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });

    if (!success) {
      return {success: false, error: error || 'Fingerprint not recognized'};
    }
    return {success: true};
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Fingerprint verification failed',
    };
  }
}
