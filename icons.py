from PIL import Image, ImageDraw, ImageFilter
import math
def make(size):
    S=size*2
    img=Image.new('RGB',(S,S),(246,247,252))
    px=img.load()
    pts=[(0.14,0.70),(0.28,0.62),(0.38,0.68),(0.52,0.50),(0.62,0.55),(0.76,0.34),(0.86,0.30)]
    pts=[(x*S,y*S) for x,y in pts]
    def curve():
        out=[]
        for i in range(len(pts)-1):
            p0=pts[max(i-1,0)];p1=pts[i];p2=pts[i+1];p3=pts[min(i+2,len(pts)-1)]
            for k in range(30):
                t=k/30
                x=0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t*t+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t**3)
                y=0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t*t+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t**3)
                out.append((x,y))
        out.append(pts[-1]);return out
    c=curve()
    d=ImageDraw.Draw(img)
    d.line(c,fill=(106,88,200),width=int(S*0.04),joint='curve')
    r=S*0.045;x,y=pts[-1]
    d.ellipse((x-r,y-r,x+r,y+r),fill=(106,88,200))
    return img.resize((size,size),Image.LANCZOS)
make(512).save('docs/icon-512.png');make(192).save('docs/icon-192.png')
