import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const windows=process.platform==='win32';
const env={...process.env};
const localJdks=path.join(root,'.tools/jdk');
if(existsSync(localJdks))env.JAVA_HOME=path.join(localJdks,readdirSync(localJdks).find(name=>name.startsWith('jdk-')));
const localSdk=path.join(root,'.tools/android-sdk');
const sdk=env.ANDROID_HOME||env.ANDROID_SDK_ROOT||(existsSync(localSdk)?localSdk:null);
if(!env.JAVA_HOME||!sdk)throw Error('Set JAVA_HOME (JDK 21) and ANDROID_HOME (SDK 36); see docs/ANDROID.md.');
env.ANDROID_HOME=sdk;
env.GRADLE_USER_HOME||=path.join(root,'.tools/gradle');
env.ANDROID_USER_HOME||=path.join(root,'.tools/android-user');
mkdirSync(env.ANDROID_USER_HOME,{recursive:true});
writeFileSync(path.join(root,'android/local.properties'),`sdk.dir=${sdk.replaceAll('\\','/').replace(':','\\:')}\n`);
const privateDir=path.join(root,'.local/android-signing');
mkdirSync(privateDir,{recursive:true});
const credentials=path.join(privateDir,'signing.json');
const keystore=path.join(privateDir,'pokerlab.jks');
function run(exe,args){
  const p=spawnSync(exe,args,{cwd:path.join(root,'android'),env,stdio:'inherit',shell:windows&&exe.endsWith('.bat')});
  if(p.error)throw p.error;
  if(p.status!==0)throw Error(`Build command failed (${p.status})`);
}
if(existsSync(credentials)!==existsSync(keystore))throw Error('Signing files incomplete. Restore the original signing.json and pokerlab.jks before building.');
if(!existsSync(credentials)){
  const secret={alias:'pokerlab',password:randomBytes(32).toString('hex')};
  env.POKERLAB_STORE_PASSWORD=secret.password;
  run(path.join(env.JAVA_HOME,'bin',windows?'keytool.exe':'keytool'),['-genkeypair','-keystore',keystore,'-storetype','JKS','-alias',secret.alias,'-storepass:env','POKERLAB_STORE_PASSWORD','-keypass:env','POKERLAB_STORE_PASSWORD','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Poker Lab, OU=Personal App, O=Ryan']);
  writeFileSync(credentials,JSON.stringify(secret,null,2),{mode:0o600});
}
const secret=JSON.parse(readFileSync(credentials,'utf8'));
env.POKERLAB_STORE_FILE=keystore;
env.POKERLAB_STORE_PASSWORD=secret.password;
env.POKERLAB_KEY_ALIAS=secret.alias;
run(windows?'gradlew.bat':'./gradlew',['assembleRelease','lintRelease','--no-daemon']);
const output=path.join(root,'artifacts');mkdirSync(output,{recursive:true});
const version=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')).version;
const apkName=`PokerLab-${version}.apk`;
copyFileSync(path.join(root,'android/app/build/outputs/apk/release/app-release.apk'),path.join(output,apkName));
console.log(`APK: artifacts/${apkName}`);
console.log('Back up .local/android-signing privately. Keep this key for future updates.');
