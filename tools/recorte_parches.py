#!/usr/bin/env python3
"""Recorta una parte de una imagen de c/ (fracciones 0-1 del ancho y alto).
Uso: python3 /tmp/apuntes/ai/sub.py <id> <x0> <y0> <x1> <y1> <sufijo>
     -> crea /tmp/apuntes/ai/c/<id>-<sufijo>.jpg   (míralo después con Read para comprobarlo)
     python3 /tmp/apuntes/ai/sub.py <id> auto <sufijo>   -> intenta aislar solo la micrografía de una captura de Moodle
     ... <sufijo> --tapar x0,y0,x1,y1[,N] [--tapar ...]  -> además tapa con un parche gris esas zonas (fracciones del recorte RESULTANTE);
                  con N escribe ese número en el parche, para preguntar «el rótulo tapado nº N señala…»
     ... <sufijo> --amarillos            -> lista las cajas de rótulo amarillas detectadas (anotaciones del microscopio virtual), numeradas, con sus fracciones
     ... <sufijo> --tapar-amarillos 1,3  -> tapa esas cajas amarillas (numeradas como en --amarillos) escribiendo su número; "todos" las tapa todas"""
import sys
from PIL import Image, ImageDraw
import numpy as np
a=sys.argv[1:]; tap=[]; lista=False; cuales=None
if '--amarillos' in a: a.remove('--amarillos'); lista=True
if '--tapar-amarillos' in a:
    k=a.index('--tapar-amarillos'); cuales=a[k+1]; del a[k:k+2]
while '--tapar' in a:
    k=a.index('--tapar'); tap.append([float(v) for v in a[k+1].split(',')]); del a[k:k+2]
i=a[0]; im=Image.open(f'/tmp/apuntes/ai/c/{i}.jpg').convert('RGB'); W,H=im.size
if a[1]=='auto':
    suf=a[2]; g=np.asarray(im.resize((W//4 or 1,H//4 or 1)),dtype=np.int16)
    bg=np.median(np.concatenate([g[:3,:].reshape(-1,3),g[-3:,:].reshape(-1,3),g[:,:3].reshape(-1,3)]),0)
    m=(np.abs(g-bg).max(2)>9)
    def run(v,th):
        best=(0,0);s=None
        for k,x in enumerate(list(v>th)+[False]):
            if x and s is None: s=k
            if not x and s is not None:
                if k-s>best[1]-best[0]: best=(s,k)
                s=None
        return best
    r0,r1=run(m.mean(1),0.55); c0,c1=run(m[r0:r1].mean(0),0.55) if r1>r0 else (0,m.shape[1])
    box=(c0*4,r0*4,min(W,c1*4),min(H,r1*4))
else:
    x0,y0,x1,y1=map(float,a[1:5]); suf=a[5]; box=(int(x0*W),int(y0*H),int(x1*W),int(y1*H))
if box[2]-box[0]<40 or box[3]-box[1]<40: sys.exit('recorte vacío o demasiado pequeño: '+str(box))
o=im.crop(box); d=ImageDraw.Draw(o)
from PIL import ImageFont
def parche(x0,y0,x1,y1,n=None):
    d.rectangle([x0,y0,x1,y1],fill=(225,225,225),outline=(90,90,90))
    if n is not None:
        try: f=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',max(15,int(min(y1-y0,40)*0.8)))
        except Exception: f=None
        d.text(((x0+x1)/2,(y0+y1)/2),str(int(n)),fill=(0,0,0),font=f,anchor='mm')
if lista or cuales:
    g=np.asarray(o,dtype=np.int16); my=(g[:,:,0]>215)&(g[:,:,1]>215)&(g[:,:,2]<110)
    cajas=[]; vis=np.zeros(my.shape,bool); Hh,Ww=my.shape
    ys,xs=np.nonzero(my)
    for y,x in zip(ys[::7],xs[::7]):
        if vis[y,x]: continue
        x0=x1=x;y0=y1=y; cambio=True
        while cambio:
            cambio=False
            for dx0,dy0,dx1,dy1 in((-3,0,0,0),(0,-3,0,0),(0,0,3,0),(0,0,0,3)):
                nx0,ny0,nx1,ny1=max(0,x0+dx0),max(0,y0+dy0),min(Ww-1,x1+dx1),min(Hh-1,y1+dy1)
                if (nx0,ny0,nx1,ny1)!=(x0,y0,x1,y1):
                    franja=my[ny0:ny1+1,nx0:nx1+1]; viejo=my[y0:y1+1,x0:x1+1]
                    if franja.sum()>viejo.sum(): x0,y0,x1,y1=nx0,ny0,nx1,ny1; cambio=True
        vis[y0:y1+1,x0:x1+1]=True
        if (x1-x0)>18 and (y1-y0)>7 and my[y0:y1+1,x0:x1+1].mean()>0.35: cajas.append((x0,y0,x1,y1))
    cajas=sorted(set(cajas),key=lambda c:(c[1]//25,c[0]))
    for n,c in enumerate(cajas,1):
        if lista: print('amarillo',n,[round(c[0]/o.width,3),round(c[1]/o.height,3),round(c[2]/o.width,3),round(c[3]/o.height,3)])
    if cuales:
        sel=range(1,len(cajas)+1) if cuales=='todos' else [int(v) for v in cuales.split(',')]
        for n in sel:
            c=cajas[n-1]; parche(c[0]-2,c[1]-2,c[2]+2,c[3]+2,n)
for t in tap: parche(t[0]*o.width,t[1]*o.height,t[2]*o.width,t[3]*o.height,t[4] if len(t)>4 else None)
fn=f'/tmp/apuntes/ai/c/{i}-{suf}.jpg'; o.save(fn,quality=85); print(fn,o.size,'fracciones',[round(box[0]/W,3),round(box[1]/H,3),round(box[2]/W,3),round(box[3]/H,3)])
