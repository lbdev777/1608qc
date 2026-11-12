/* 1608 — catalogue vivant. Prix en cents CAD, visuels des produits fournis par la marque. */
window.STORE_PRODUCTS = Object.freeze([
  {
    id:'terrain-camo', name:'TERRAIN 1608', variant:'CAMOUFLAGE FORÊT', category:'hoodies',
    price:8900, fit:'COUPE BOXY', material:'TEXTURE GAUFRÉE',
    photos:['assets/terrain-front.webp','assets/terrain-back.webp'],
    description:"Camouflage forêt, signature discrète sur la poitrine. Au dos, un paysage graphique traverse la pièce. Une silhouette ample pensée pour sortir du cadre.",
    features:['Camouflage forêt texturé','Logo discret à l’avant','Grand motif montagne au dos','Coupe boxy unisexe'],
    ref:'UT0347', sizes:['S','M','L','XL','2XL']
  },
  {
    id:'horizon-noir', name:'HORIZON 1608',variant:'NOIR INTÉGRAL',category:'hoodies',
    price:6900,fit:'COUPE OVERSIZED',material:'NOIR / BLANC',
    photos:['assets/6a1acf7402a04ced88bf9d9334aa40a2.webp','assets/602c6f2b7a8c48eb94d47467b7a53e45.webp'],
    description:"Un logo signé 1608 devant. Une autre perspective derrière. Le globe blanc rencontre une silhouette noire à l’allure intemporelle.",
    features:['Logo script sur la poitrine','Graphisme globe au dos','Coupe oversized','Noir et blanc'],
    ref:'RO0286',sizes:['S','M','L','XL','2XL']
  },
  {
    id:'signature-brode',name:'SIGNATURE 1608',variant:'BRODERIE / NOIR',category:'hoodies',
    price:6900,fit:'COUPE BOXY',material:'BRODERIE',
    photos:['assets/3594dcaa9f47498a85141f0fcd303e7d.webp','assets/e1287343258341579fbf693f24305b27.webp'],
    description:"Un seul détail suffit. La signature MilleSixCentHuit brodée en blanc sur la poitrine. Dos volontairement uni, volume ample et allure nette.",
    features:['Lettrage brodé sur la poitrine','Dos uni','Coupe boxy','Noir essentiel'],
    ref:'RU0118',sizes:['S','M','L','XL','2XL']
  },
  {
    id:'contraste-marine',name:'CONTRASTE 1608',variant:'MARINE / IVOIRE',category:'hoodies',
    price:8900,fit:'COUPE RAGLAN',material:'BICOLORE',
    photos:['assets/369259aed9eb45dabaf0d5381f59a522.webp','assets/7482beb55a15466a96b32ab1888e3a39.webp'],
    description:"Marine profond et capuche ivoire. Deux fleurs de lys encadrent le 1608 à l’avant. Au dos, notre emblème signature prend toute la place.",
    features:['Capuche ivoire contrastante','Manches raglan','Emblème grand format au dos','Poche avant'],
    ref:'UT0280',sizes:['S','M','L','XL','2XL']
  },
  {
    id:'archive-denim',name:'ARCHIVE 1608',variant:'DENIM DÉLAVÉ',category:'denim',
    price:6900,fit:'COUPE LARGE',material:'DENIM GRIS',
    photos:['assets/a759c522e675400aaceb6aabeb5356d6.webp','assets/009795ccb75940d0967947b4e9f32de1.webp'],
    description:"Un short long en denim gris délavé. Signature verticale sur la jambe, détails usés et volume assumé. Une pièce qui se remarque sans en faire trop.",
    features:['Denim gris délavé','Lettrage vertical blanc','Coupe large','Poches avant et arrière'],
    ref:null,sizes:['S','M','L','XL','2XL']
  },
  {
    id:'heritage-noir',name:'HÉRITAGE 1608',variant:'NOIR / GRAPHISME',category:'hoodies',
    price:9900,fit:'COUPE AMPLE',material:'HEAVYWEIGHT',
    photos:['assets/9fe74b8725ae46c4b48458ce342efb62.webp','assets/7d1c7f4ba5054b3aa26d3cb72500235c.webp'],
    description:"Une signature compacte sur la poitrine. Des manches et un dos travaillés en contraste. HÉRITAGE assemble les codes 1608 sur un hoodie à présence forte.",
    features:['Coton ouaté heavyweight','Graphismes sur les manches','Impression au dos','Coupe ample'],
    ref:null,sizes:['S','M','L','XL','2XL']
  }
]);
window.STORE_CURRENCY = cents => new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD',maximumFractionDigits:2}).format(cents/100);
