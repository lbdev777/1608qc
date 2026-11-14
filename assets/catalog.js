/* 1608 — catalogue vivant. Prix en cents CAD, visuels des produits fournis par la marque. */
window.STORE_PRODUCTS = Object.freeze([
  {
    id:'orbite-noir', name:'ORBITE 1608', variant:'NOIR / QC·CA', category:'hoodies',
    price:8900, fit:'COUPE OVERSIZED', material:'MOLLETON NOIR',
    photos:['assets/cb08506f9e9f4d24a062305fbe3a0427.webp','assets/e07bf23c434a460b9634a7b5fd4fa1cb.webp'],
    description:"Un logo 1608 encadré de fleurs de lys sur la poitrine. Au dos, un grand graphisme orbital dessine notre signature QC/CA. Un hoodie noir oversized qui change de perspective selon l’angle.",
    features:['Coupe oversized','1608 et fleurs de lys sur la poitrine','Grand graphisme orbital blanc au dos','Capuche à cordon contrastant'],
    ref:'RW0058',sizes:['S','M','L','XL'],isNew:true
  },
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
    ref:'R00286',sizes:['S','M','L','XL','2XL']
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
  },
  {
    id:"uniforme-zip",name:"UNIFORME ZIP 1608",variant:"NOIR DÉLAVÉ / SIGNATURE",category:"hoodies",
    price:8900,fit:"COUPE AMPLE",material:"FERMETURE ÉCLAIR",
    photos:["assets/b628367f22434b5bb29ac5968e05b077.webp","assets/e18d77ba9c5c427eb264409ffacbb8ed.webp"],
    description:"Zip à capuche noir délavé. Signature manuscrite sur la poitrine, grand 1608 au dos et fermeture pleine longueur. À porter seul ou avec le jogger assorti.",
    features:["Noir à effet délavé","Fermeture éclair pleine longueur","Signature blanche sur la poitrine","Marquage grand format au dos"],ref:null,sizes:["S","M","L","XL","2XL"],pairedWith:"uniforme-jogger"
  },
  {
    id:"uniforme-jogger",name:"UNIFORME JOGGER 1608",variant:"NOIR / SIGNATURE",category:"pants",
    price:6900,fit:"COUPE DÉCONTRACTÉE",material:"TAILLE ÉLASTIQUE",
    photos:["assets/e5a25fb4c850489785a491f805092f4a.webp","assets/d76dd70aeebd4c25ba02bf651df1dbab.webp"],
    description:"Pantalon jogger noir assorti au zip UNIFORME. Signature blanche sur la cuisse, cordon à la taille et chevilles resserrées. Une silhouette coordonnée sans en faire trop.",
    features:["Pantalon noir","Signature blanche sur la cuisse","Taille élastique avec cordon","Bas de jambe resserrés"],ref:null,sizes:["S","M","L","XL","2XL"],pairedWith:"uniforme-zip"
  }
]);
window.STORE_CURRENCY = cents => new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD',maximumFractionDigits:2}).format(cents/100);

/* Ensembles 1608 — calcul partagé par panier et caisse. */
window.STORE_BUNDLE_PRICING=Object.freeze({
  calculate(lines){
    const catalog=window.STORE_PRODUCTS||[];
    const valid=(Array.isArray(lines)?lines:[]).filter(line=>catalog.some(p=>p.id===line.id)&&Number.isInteger(line.qty)&&line.qty>0&&line.qty<=10);
    const subtotal=valid.reduce((total,line)=>total+catalog.find(p=>p.id===line.id).price*line.qty,0);
    const models=new Set(valid.map(line=>line.id)).size;
    const matchingLook=valid.some(x=>x.id==='uniforme-zip')&&valid.some(x=>x.id==='uniforme-jogger');
    const percent=models>=3||matchingLook?15:models>=2?10:0;
    const discount=Math.round(subtotal*percent/100);
    return {subtotal,discount,total:subtotal-discount,percent,models};
  }
});
