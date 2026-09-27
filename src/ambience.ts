/** Quiet, optional procedural ambience, started only after an explicit button press. */
export class Ambience {
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private noise:AudioBuffer|null=null;
  private elapsed=0;
  private nextRustle=9;
  private audible=false;
  enabled=false;

  async toggle(){
    if(!this.context){
      this.context=new AudioContext();
      const ctx=this.context;this.master=ctx.createGain();this.master.gain.value=0;this.master.connect(ctx.destination);
      this.noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);
      const data=this.noise.getChannelData(0);let last=0;
      for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*3;}
      const wind=ctx.createBufferSource();wind.buffer=this.noise;wind.loop=true;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=260;
      const level=ctx.createGain();level.gain.value=.18;wind.connect(filter).connect(level).connect(this.master);wind.start();
      const drone=ctx.createOscillator();drone.frequency.value=47;const droneLevel=ctx.createGain();droneLevel.gain.value=.013;drone.connect(droneLevel).connect(this.master);drone.start();
    }
    await this.context.resume();this.enabled=!this.enabled;this.setPaused(false);return this.enabled;
  }

  setPaused(paused:boolean){const audible=this.enabled&&!paused;if(audible===this.audible)return;this.audible=audible;if(this.context&&this.master)this.master.gain.setTargetAtTime(audible?.34:0,this.context.currentTime,.35);}
  update(dt:number,paused:boolean,pan:number){
    this.setPaused(paused);if(!this.enabled||paused||!this.context||!this.master||!this.noise)return;
    this.elapsed+=dt;if(this.elapsed<this.nextRustle)return;this.nextRustle=this.elapsed+10+Math.random()*8;
    const ctx=this.context,source=ctx.createBufferSource();source.buffer=this.noise;source.playbackRate.value=.7;
    const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=750;
    const stereo=ctx.createStereoPanner();stereo.pan.value=Math.max(-.8,Math.min(.8,pan));
    const volume=ctx.createGain(),t=ctx.currentTime;volume.gain.setValueAtTime(0,t);volume.gain.linearRampToValueAtTime(.12,t+.3);volume.gain.exponentialRampToValueAtTime(.001,t+1.6);
    source.connect(filter).connect(stereo).connect(volume).connect(this.master);source.start();source.stop(t+1.7);
    source.onended=()=>{source.disconnect();filter.disconnect();stereo.disconnect();volume.disconnect();};
  }
}
