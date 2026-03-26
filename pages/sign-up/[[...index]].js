import { SignUp } from '@clerk/nextjs'
export default function SignUpPage(){
  return <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" afterSignUpUrl="/dashboard"/>
  </div>
}
