import Head from 'next/head'
import Link from 'next/link'

const SECTIONS = [
  {
    id: 'associations',
    title: 'Landlord associations',
    intro: 'Joining a landlord association gives you access to legal helplines, template tenancy documents, and expert guidance, often cheaper than a single call to a solicitor.',
    items: [
      { name:'NRLA', full:'National Residential Landlords Association', url:'https://www.nrla.org.uk', desc:'The largest UK landlord association with over 100,000 members. Legal helpline, tenancy documents, training and lobbying. Essential for England and Wales landlords.', tag:'England & Wales' },
      { name:'British Landlords Association', full:'BLA', url:'https://www.thebla.co.uk', desc:'Free and paid membership. Legal advice, tenancy documents and landlord insurance partnerships across the UK.', tag:'UK-wide' },
      { name:'iHowz Landlord Association', url:'https://www.ihowz.uk', desc:'Practical guides, legal updates, and a community for independent landlords managing their own properties.', tag:'UK-wide' },
      { name:'Scottish Association of Landlords', full:'SAL', url:'https://www.scottishlandlords.com', desc:'Scotland\'s leading landlord association. Essential for Private Residential Tenancy compliance, tribunal support and mandatory landlord registration guidance.', tag:'Scotland' },
      { name:'The Landlord Association', full:'TLA', url:'https://www.landlordassociation.org.uk', desc:'Free membership with access to tenancy agreements, legal guides and landlord forums.', tag:'UK-wide' },
      { name:'North West Landlords Association', full:'NWLA', url:'https://www.nwla.org.uk', desc:'Regional association covering the North West. Local council licensing updates and regional networking events.', tag:'North West' },
      { name:'Guild of Residential Landlords', full:'GRL', url:'https://www.grl.co.uk', desc:'UK-wide association with legal helpline, tenancy documents and rent guarantee insurance partnerships.', tag:'UK-wide' },
      { name:'Westcountry Landlords Association', url:'https://www.wlainfo.co.uk', desc:'Regional association for landlords in Devon, Cornwall and the wider South West.', tag:'South West' },
    ]
  },
  {
    id: 'publications',
    title: 'News and publications',
    intro: 'These publications break landlord legislation news, court case outcomes and market trends, often faster than official government channels.',
    items: [
      { name:'LandlordZONE', url:'https://www.landlordzone.co.uk', desc:'One of the longest-running landlord news sites in the UK. Essential for breaking news on legislation, eviction law and policy changes.', tag:'News' },
      { name:'Landlord Today', url:'https://www.landlordtoday.co.uk', desc:'Daily news covering the UK private rented sector. Strong coverage of the Renters Rights Act, EPC deadlines and tax changes.', tag:'News' },
      { name:'Property118', url:'https://www.property118.com', desc:'News, analysis and strategy for UK property investors. Particularly strong on Section 24, tax and incorporation. Features an active community forum.', tag:'News & community' },
      { name:'Landlord Law Blog', full:'Tessa Shepperson', url:'https://www.landlordlawblog.co.uk', desc:'Written by solicitor Tessa Shepperson. Highly accurate legal analysis of landlord and tenant law, one of the most trustworthy sources for compliance guidance online.', tag:'Legal' },
      { name:'LandlordVision Blog', url:'https://www.landlordvision.co.uk/blog', desc:'Practical guides on property management, accounting and compliance for independent landlords.', tag:'Guides' },
      { name:'Property Investment Project', url:'https://www.propertyinvestmentproject.co.uk', desc:'Data-driven analysis of UK property investment. Good for yield calculations, area analysis and buy-to-let strategy.', tag:'Investment' },
      { name:'PropertyHawk Blog', url:'https://www.propertyhawk.co.uk/blog', desc:'Practical landlord guides covering compliance, tenancy management and legislation explained in plain English.', tag:'Guides' },
      { name:'Property Investor Today', url:'https://www.propertyinvestortoday.co.uk', desc:'News and analysis for property investors covering both residential and commercial investment trends.', tag:'Investment' },
      { name:'Your Property Network Magazine', full:'YPN', url:'https://www.yourpropertynetwork.co.uk', desc:'Monthly magazine for UK property investors featuring strategy, case studies and market analysis.', tag:'Magazine' },
    ]
  },
  {
    id: 'forums',
    title: 'Forums and communities',
    intro: 'Peer advice from experienced landlords is often more useful than anything you can read. These communities provide real-world answers to real landlord problems.',
    items: [
      { name:'Property118 Forum', url:'https://www.property118.com', desc:'Active forum covering tax strategy, Section 24, lettings law and buy-to-let investment. Frequented by experienced portfolio landlords.', tag:'Tax & strategy' },
      { name:'LandlordZONE Forum', url:'https://www.landlordzone.co.uk/forum', desc:'High-volume forum with questions on compliance, difficult tenants, deposit disputes and legislation. Good for finding out how others have handled similar situations.', tag:'Compliance' },
      { name:'Property Tribes', url:'https://www.propertytribes.com', desc:'Friendly and supportive community covering all aspects of property investment and management. Well-suited to beginner and intermediate landlords.', tag:'Community' },
      { name:'NRLA Member Forum', url:'https://www.nrla.org.uk/forum', desc:'Members-only forum with high-quality moderated advice. The NRLA legal team occasionally responds directly to member questions.', tag:'Members only' },
      { name:'Property Forum', url:'https://www.propertyforum.com', desc:'General property discussion covering buy-to-let, development and commercial property.', tag:'General' },
      { name:'Reddit: r/uklandlords', url:'https://www.reddit.com/r/uklandlords', desc:'Over 43,000 UK landlords asking and answering questions. Anonymous and direct. Particularly good for gauging how other landlords are responding to legislative changes.', tag:'Reddit' },
    ]
  },
  {
    id: 'podcasts',
    title: 'Podcasts',
    intro: 'Learn about property investment, legislation and management while commuting. Most of these have years of back catalogues covering every topic a UK landlord needs.',
    items: [
      { name:'The Property Podcast', full:'Rob & Rob', url:'https://www.propertyhub.net/podcast', desc:'The most popular UK property podcast with over 500 episodes. Covers investment strategy, market analysis and landlord news. Essential listening for any serious investor.', tag:'Investment' },
      { name:'Listen Up Landlords', full:'NRLA', url:'https://www.nrla.org.uk', desc:'The NRLA\'s official podcast featuring deep dives into legislation, compliance and landlord rights. Highly accurate legal content straight from the UK\'s largest landlord body.', tag:'Compliance' },
      { name:'Inside Property Investing', full:'Mike Stenhouse', url:'https://www.insidepropertyinvesting.com', desc:'Strategy-focused podcast for investors building a UK property portfolio. Real case studies from working landlords.', tag:'Strategy' },
      { name:'The Business of Property Podcast', url:'https://www.businessofproperty.com', desc:'Treating property as a business: systems, processes and scaling. Useful for landlords who want to run their portfolio more professionally.', tag:'Business' },
      { name:'Property Magic Podcast', full:'Simon Zutshi', url:'https://www.simonzutshi.com', desc:'Investment strategy, creative deal structures and portfolio building from one of the UK\'s most experienced property educators.', tag:'Investment' },
      { name:'This Week in Property', full:'Richard Swan', url:'https://www.thisweekinproperty.com', desc:'Weekly roundup of UK property news, legislation changes and market data. Good for staying on top of what\'s happening without spending hours reading.', tag:'News' },
      { name:'The Property Rebel Podcast', url:'https://www.thepropertyrebel.co.uk', desc:'Covers unconventional investment strategies, deal sourcing and portfolio growth tactics for entrepreneurial landlords.', tag:'Strategy' },
    ]
  },
  {
    id: 'youtube',
    title: 'YouTube channels',
    intro: 'Video content for landlords who prefer to watch and learn. These channels cover compliance, investment and management in depth with real examples.',
    items: [
      { name:'Succeed In Property', full:'Ranjan Bhattacharya', url:'https://www.youtube.com/@SucceedInProperty', desc:'Practical property investment education with strong content on tax, deal analysis and portfolio strategy from an experienced portfolio landlord.', tag:'Investment' },
      { name:'Property Hub', full:'Rob & Rob', url:'https://www.youtube.com/@PropertyHub', desc:'Companion to The Property Podcast. Market analysis, investment strategies and viewer Q&As. The largest UK property YouTube channel.', tag:'Investment' },
      { name:'Moving Home with Charlie', full:'Charlie Lamdin', url:'https://www.youtube.com/@MovingHomewithCharlie', desc:'Market data and property trends. Less investment-focused: useful for understanding what buyers and tenants are thinking.', tag:'Market' },
      { name:'The Property Circle', full:'Ste Hamilton', url:'https://www.youtube.com/@SteHamilton', desc:'Practical property management and investment from a working landlord. Honest, relatable content grounded in real experience.', tag:'Management' },
      { name:'Property Advisor', full:'Danny Valencia', url:'https://www.youtube.com/@DannyValencia', desc:'Investment analysis, deal breakdowns and portfolio strategy with a data-driven approach.', tag:'Investment' },
      { name:'Lettings Agency Growth', full:'Christopher Watkin', url:'https://www.youtube.com/@ChristopherWatkin', desc:'Primarily aimed at letting agents but contains valuable insights on tenant management, legislation and market trends relevant to any landlord.', tag:'Industry' },
    ]
  },
]

const TAG_COL = { 'Scotland':'#005EB8', 'North West':'#7F77DD', 'South West':'#D85A30', 'Legal':'#EF9F27', 'Members only':'#E24B4A' }

export default function Resources() {
  return (
    <>
      <Head>
        <title>UK Landlord Resources: Associations, Publications, Podcasts | Lettly</title>
        <meta name="description" content="Curated list of the best UK landlord associations, news publications, forums, podcasts and YouTube channels. Free resources for private landlords in England, Scotland and Wales."/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="canonical" href="https://lettly.co/resources"/>
      </Head>
      <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:'var(--font)'}}>
        <nav style={{background:'var(--surface)',borderBottom:'0.5px solid var(--border)',padding:'0 clamp(16px,4vw,48px)',display:'flex',alignItems:'center',justifyContent:'space-between',height:56}}>
          <Link href="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
            <div style={{width:32,height:32,background:'var(--brand)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{color:'#fff',fontSize:16,fontWeight:700,fontFamily:'var(--display)',fontStyle:'italic'}}>L</span>
            </div>
            <span style={{fontFamily:'var(--display)',fontSize:18,fontWeight:400,color:'var(--text)'}}>Lettly</span>
          </Link>
          <div style={{display:'flex',gap:16,alignItems:'center'}}>
            <Link href="/" style={{fontSize:13,color:'var(--text-2)',textDecoration:'none'}}>Home</Link>
            <a href="https://accounts.lettly.co/sign-up" style={{background:'var(--brand)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'8px 18px',fontSize:13,fontWeight:500}}>Try free</a>
          </div>
        </nav>

        <div style={{maxWidth:860,margin:'0 auto',padding:'clamp(32px,5vw,64px) clamp(16px,4vw,48px)'}}>
          <div style={{marginBottom:48}}>
            <h1 style={{fontFamily:'var(--display)',fontSize:'clamp(28px,4vw,42px)',fontWeight:300,color:'var(--text)',marginBottom:12}}>UK landlord resources</h1>
            <p style={{fontSize:15,color:'var(--text-2)',lineHeight:1.75,maxWidth:640}}>A curated directory of the best associations, publications, forums, podcasts and YouTube channels for UK private landlords. We do not have commercial relationships with any of these: they are here because they are genuinely useful.</p>
          </div>

          {/* Jump links */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:48,paddingBottom:24,borderBottom:'0.5px solid var(--border)'}}>
            {SECTIONS.map(s=>(
              <a key={s.id} href={'#'+s.id} style={{padding:'7px 16px',borderRadius:20,fontSize:12,fontWeight:500,border:'0.5px solid var(--border-strong)',color:'var(--text-2)',textDecoration:'none',background:'var(--surface)'}}>{s.title}</a>
            ))}
          </div>

          {SECTIONS.map(section=>(
            <div key={section.id} id={section.id} style={{marginBottom:56}}>
              <h2 style={{fontFamily:'var(--display)',fontSize:24,fontWeight:300,color:'var(--text)',marginBottom:8}}>{section.title}</h2>
              <p style={{fontSize:14,color:'var(--text-2)',lineHeight:1.75,marginBottom:24,maxWidth:680}}>{section.intro}</p>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {section.items.map(item=>(
                  <div key={item.name} style={{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                        <span style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{item.name}</span>
                        {item.full&&<span style={{fontSize:12,color:'var(--text-3)'}}>{item.full}</span>}
                        {item.tag&&<span style={{fontSize:11,fontWeight:500,padding:'2px 9px',borderRadius:20,background:TAG_COL[item.tag]?TAG_COL[item.tag]+'18':'#eaf3de',color:TAG_COL[item.tag]||'#27500A'}}>{item.tag}</span>}
                      </div>
                      <p style={{fontSize:13,color:'var(--text-2)',lineHeight:1.7,margin:0}}>{item.desc}</p>
                    </div>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,background:'var(--surface2)',color:'var(--text-2)',border:'0.5px solid var(--border-strong)',borderRadius:7,padding:'7px 14px',fontSize:12,fontWeight:500,textDecoration:'none',whiteSpace:'nowrap'}}>Visit site</a>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{background:'var(--brand-subtle)',border:'0.5px solid rgba(27,94,59,0.2)',borderRadius:14,padding:'24px 28px',marginTop:16}}>
            <div style={{fontFamily:'var(--display)',fontSize:20,fontWeight:300,marginBottom:8,color:'var(--text)'}}>Manage your portfolio with Lettly</div>
            <p style={{fontSize:14,color:'var(--text-2)',lineHeight:1.75,marginBottom:16}}>While these resources help you learn, Lettly does the work. Gas cert tracking, EICR reminders, compliance checklists, rent tracking and AI document reading: all in one place from £8/month.</p>
            <a href="https://accounts.lettly.co/sign-up" style={{display:'inline-block',background:'var(--brand)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'10px 24px',fontSize:14,fontWeight:500}}>Try Lettly free for 14 days</a>
          </div>
        </div>
      </div>
    </>
  )
}
