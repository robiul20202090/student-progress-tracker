/* Isolated test catalog: student records store only id and gender, never a real photo. */
window.SPT_AVATAR_CATALOG = {
  male: Array.from({ length: 23 }, (_, index) => ({
    id: `male-${String(index + 1).padStart(2, '0')}`,
    gender: 'male',
    src: `assets/avatars/male-${String(index + 1).padStart(2, '0')}.webp`
  })),
  female: Array.from({ length: 26 }, (_, index) => ({
    id: `female-${String(index + 1).padStart(2, '0')}`,
    gender: 'female',
    src: `assets/avatars/female-${String(index + 1).padStart(2, '0')}.webp`
  }))
};
