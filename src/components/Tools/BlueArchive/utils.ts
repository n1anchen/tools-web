const loadImg = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};

export const loadImages = async (haloSrc: string, crossSrc: string): Promise<{halo: HTMLImageElement, cross: HTMLImageElement}> => {
  const [halo, cross] = await Promise.all([
    loadImg(haloSrc),
    loadImg(crossSrc),
  ]);
  return { halo, cross };
};

export const loadFont = async (fontSize: number, content: string = 'A') => {
  try {
    // 并行触发本地字体和网络字体对应 unicode-range 分片的下载
    await Promise.all([
      document.fonts.load(`900 ${fontSize}px RoGSans`, content),
      document.fonts.load(`900 ${fontSize}px 'Noto Sans SC'`, content),
    ]);
    // 确保所有已触发的字体加载全部完成
    await document.fonts.ready;
  } catch (e) {
    console.warn('Font load area warning:', e);
  }
};
