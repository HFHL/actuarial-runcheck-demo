import React from 'react';
import type {Caption} from '@remotion/captions';
import {Audio} from '@remotion/media';
import {
  AbsoluteFill, Composition, Img, Sequence, interpolate, registerRoot,
  staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import timeline from './timeline.json';

const white = '#f3faf6';
const mint = '#94e3c0';
const muted = '#bad0c8';
const fonts = '"PingFang SC", "Noto Sans CJK SC", "Helvetica Neue", sans-serif';
const viewportWidth = 900;
const viewportHeight = 840;
const chapters = [...new Set(timeline.scenes.map(scene => scene.chapter))];
type Shot = (typeof timeline.scenes)[number];

function Capture({shot}: {shot: Shot}) {
  const frame = useCurrentFrame();
  const [x,y,width,height] = shot.r;
  const scale = Math.min(viewportWidth/width,viewportHeight/height);
  const shotWidth = width*scale;
  const shotHeight = height*scale;
  const markerVisible = x > 8 && x < width-8 && y > 8 && y < height-8;
  const ring = interpolate(frame,[0,10,26,36],[0.6,1,1.45,1.6],{
    extrapolateLeft:'clamp',extrapolateRight:'clamp',
  });
  const ringOpacity = interpolate(frame,[0,9,31,42],[0,.85,.65,0],{
    extrapolateLeft:'clamp',extrapolateRight:'clamp',
  });
  return (
    <div style={{width:shotWidth,height:shotHeight,position:'relative',overflow:'hidden',borderRadius:12,boxShadow:'0 24px 72px #030e0d88',background:'#f7f8fa'}}>
      <Img src={staticFile(`frames/${shot.name}.jpg`)} style={{display:'block',width:shotWidth,height:shotHeight}}/>
      {markerVisible && <div style={{
        position:'absolute',width:31,height:31,left:x*scale-15.5,top:y*scale-15.5,
        border:'3px solid #20a67e',borderRadius:'50%',boxShadow:'0 0 0 2px #f5fffa',
        opacity:ringOpacity,scale:ring,pointerEvents:'none',boxSizing:'border-box',
      }}/>}
    </div>
  );
}

function Walkthrough() {
  const frame = useCurrentFrame();
  const {fps,durationInFrames} = useVideoConfig();
  const index = timeline.scenes.findLastIndex(scene => scene.from <= frame);
  const shot = timeline.scenes[index];
  const chapter = chapters.indexOf(shot.chapter);
  const captions: Caption[] = timeline.captions;
  const caption = captions.find(item => frame*1000/fps+0.1 >= item.startMs && frame*1000/fps+0.1 < item.endMs) ?? captions[index];
  const lift = interpolate(frame-shot.from,[0,9],[9,0],{extrapolateRight:'clamp'});
  const alpha = interpolate(frame-shot.from,[0,9],[0.65,1],{extrapolateRight:'clamp'});

  return (
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 25% 0%, #1a3832 0%, #0b221e 72%)',color:white,fontFamily:fonts,padding:'46px 78px 34px',boxSizing:'border-box'}}>
      <Audio src={staticFile('narration.m4a')}/>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',height:54,borderBottom:'1px solid #47665c',paddingBottom:18,boxSizing:'border-box'}}>
        <div style={{fontSize:24,fontWeight:640}}>Actuarial Review Workspace</div>
        <div style={{fontSize:19,color:muted}}>产品操作演示 · AXIS Batch 015</div>
      </header>

      <div style={{display:'grid',gridTemplateColumns:'900px minmax(0,1fr)',gap:72,alignItems:'center',height:874}}>
        <div style={{position:'relative',width:viewportWidth,height:viewportHeight}}>
          {timeline.scenes.map(scene => (
            <Sequence key={scene.name} name={scene.title} from={scene.from} durationInFrames={scene.frames} premountFor={12}>
              <Capture shot={scene}/>
            </Sequence>
          ))}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:24}}>
          <div style={{display:'flex',alignItems:'center',gap:13,color:mint,fontSize:24,fontWeight:600}}>
            <span style={{display:'inline-block',width:30,height:2,background:mint}}/>
            {shot.chapter}
          </div>
          <div key={shot.name} style={{opacity:alpha,translate:`0 ${lift}px`}}>
            <h1 style={{fontSize:66,lineHeight:1.16,margin:'0 0 24px',letterSpacing:'-0.035em',fontWeight:680}}>{shot.title}</h1>
            <p style={{fontSize:37,lineHeight:1.52,color:'#d9ebe4',margin:0,letterSpacing:'-0.01em'}}>{caption.text}</p>
          </div>
          <div style={{display:'flex',gap:7,marginTop:28}} aria-label="章节进度">
            {chapters.map((name,i) => <div key={name} style={{width:31,height:4,borderRadius:3,background:i===chapter?mint:i<chapter?'#6f9b8a':'#47665c'}}/>)}
          </div>
        </div>
      </div>

      <footer style={{display:'flex',alignItems:'center',gap:20,fontSize:17,color:muted,fontVariantNumeric:'tabular-nums'}}>
        <div>模拟工作区</div>
        <div style={{height:3,background:'#47665c',flex:1,borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${((frame+1)/durationInFrames)*100}%`,background:mint}}/>
        </div>
        <div>{String(index+1).padStart(2,'0')} / {timeline.scenes.length}</div>
      </footer>
    </AbsoluteFill>
  );
}

registerRoot(() => (
  <Composition id="ActuarialWalkthrough" component={Walkthrough}
    width={1920} height={1080} fps={timeline.fps} durationInFrames={timeline.frames}/>
));
