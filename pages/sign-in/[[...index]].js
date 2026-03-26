import { SignIn } from '@clerk/nextjs'
export default function SignInPage(){
  return <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" afterSignInUrl="/dashboard"/>
  </div>
}
