import * as THREE from "three";

export function signedVolumeOfTriangle(p1, p2, p3) {
  const v321 = p3.x * p2.y * p1.z;
  const v231 = p2.x * p3.y * p1.z;
  const v312 = p3.x * p1.y * p2.z;
  const v132 = p1.x * p3.y * p2.z;
  const v213 = p2.x * p1.y * p3.z;
  const v123 = p1.x * p2.y * p3.z;
  return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
}

export function calculateCenter(geometry) {
  let volume = 0;
  let centerOfMass = new THREE.Vector3();
  const positions = geometry.attributes.position.array;

  for (let i = 0; i < positions.length; i += 9) {
    const p1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
    const p2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
    const p3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

    const signedVolume = signedVolumeOfTriangle(p1, p2, p3);
    volume += signedVolume;

    const centroid = new THREE.Vector3()
      .add(p1)
      .add(p2)
      .add(p3)
      .multiplyScalar(1.0 / 4.0);

    centerOfMass.add(centroid.multiplyScalar(signedVolume));
  }

  if (Math.abs(volume) > 1e-8) {
    centerOfMass.divideScalar(volume);
  }

  return { center: centerOfMass, totalVolume: Math.abs(volume) };
}
