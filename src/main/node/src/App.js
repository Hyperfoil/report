import React, { useState, useRef } from 'react';
import { Helmet } from "react-helmet";

import { 
  Page, 
  PageHeader, 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  PageSidebar, 
  PageSection, 
  PageSectionVariants 
} from '@patternfly/react-core';
import {
  Button,
  Checkbox,
  KebabToggle,
  Nav,
  NavExpandable,
  NavItem,
  NavItemSeparator,
  NavList,
  NavGroup,
  NavVariants,
  TextContent,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
  ToolbarSection,
  ContextSelector,
  ContextSelectorItem,
  Dropdown,
  DropdownToggle,
  DropdownItem,
  DropdownSeparator,
  DropdownPosition,
  DropdownDirection,

} from '@patternfly/react-core';
import {
  ListUlIcon,
  SortAlphaDownIcon,
  TableIcon,
  OutlinedUserIcon,
  SignOutAltIcon,
  CogIcon,
  ImageIcon,
  CaretDownIcon,
  SaveIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  TimesIcon,
} from '@patternfly/react-icons';
import Popover from '@material-ui/core/Popover';


import { Route, Switch, withRouter } from 'react-router'
import { NavLink } from 'react-router-dom';
import { DateTime, Duration } from 'luxon';
import { AutoSizer } from 'react-virtualized';

//import data from './result.json';

import HistoChart, { getHisto } from './components/HistoChart';
import WideBarChart, { getAreaBars } from './components/WideBarChart';
import DistributionTimeseriesChart, { getSeries } from './components/DistributionTimeseriesChart';
import theme from './theme';

const colorNames = Object.keys(theme.colors.chart);

const fromNano = (ns) => {
  if (ns > 1000000000) {
    return Number(ns / 1000000000.0).toFixed(3) + ' s'
  } else if (ns > 1000000) {
    return Number(ns / 1000000.0).toFixed(3) + ' ms'
  } else {
    return ns + ' ns'
  }
}

  //THIS SECTION FOR TOTAL.PHASE+NAME 
  const phaseMetrics = data.total[0].data.reduce((rtrn, entry) => {
    const v = rtrn[entry.Phase] || { metrics: new Set([]) }
    v.metrics.add(entry.Name)
    rtrn[entry.Phase] = v;
    return rtrn;
  }, {})
  Object.keys(phaseMetrics).forEach(key => {
    phaseMetrics[key] = [...phaseMetrics[key].metrics]
  })
  ///////////////////////////////////////////////////////////////

const Details = withRouter(({ history }) => {
  const forks = Object.keys(data.phase).reduce((rtrn, phaseName) => {
    const phase = data.phase[phaseName];
    Object.keys(phase.iteration).forEach(iterationName => {
      const iteration = phase.iteration[iterationName]
      Object.keys(iteration.fork).forEach(forkName => {
        const fork = iteration.fork[forkName];
        if (typeof rtrn[forkName] === "undefined") {
          rtrn[forkName] = {}
        }

        Object.keys(fork.metric).forEach(metricName => {
          if (typeof rtrn[forkName][metricName] === "undefined") {
            rtrn[forkName][metricName] = {}
          }
          if (typeof rtrn[forkName][metricName][phaseName] === "undefined") {
            rtrn[forkName][metricName][phaseName] = []
          }
          const entry = rtrn[forkName][metricName][phaseName];
          //const metric = fork.metric[metricName]
          const phaseLink = phaseName + "_" + (iterationName !== "all" ? iterationName + "_" : "") + forkName
          const phaseKey = phaseLink + "_" + metricName;
          entry.push({ name: phaseKey, onClick: (e) => history.push(phaseLink) });
        })
      })
    })
    return rtrn;
  }, {});
  const allPhases = data.total[0].data.map(row => row.Phase.replace(/\//g, "_") + (typeof row.Name !== "undefined" ? "_" + row.Name : "" ) + (typeof row.Metric !== "undefined" ? "_" + row.Metric : ""));
  const seriesData = getSeries(data);
  const seriesCharts = Object.keys(forks).reduce((rtrn, forkName) => {
    const fork = forks[forkName]
    Object.keys(fork).forEach(metricName => {
      const metric = fork[metricName];
      const series = Object.keys(metric).map((metricName, metricIndex) => {
        return {
          name: metricName,
          colorGroup: colorNames[metricIndex],
          phases: metric[metricName],
          stats: ['Mean', 'p90.0', 'p99.0', 'p99.9'],
        }
      });
      rtrn.push(
        (
          <PageSection key={forkName + "_" + metricName}>
            <Card style={{ pageBreakInside: 'avoid' }}>
              <CardHeader>
                <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                  <ToolbarGroup><ToolbarItem>{`${forkName} ${metricName} response times`}</ToolbarItem></ToolbarGroup>
                  {/* <ToolbarGroup><ToolbarItem><Button variant="plain" aria-label="Action"><EditIcon /></Button></ToolbarItem></ToolbarGroup> */}
                </Toolbar>
              </CardHeader>
              <CardBody style={{ minHeight: 400 }}>
                <AutoSizer>{({ height, width }) => {
                  return (
                    <DistributionTimeseriesChart
                      height={height}
                      width={width}
                      data={seriesData}
                      domain={[data.info.startTime, data.info.terminateTime]}
                      series={series}
                      right={{
                        name: "Requests/s",
                        color: '#A30000',
                        stat: `${forkName}_${metricName}_Requests`,
                        scaleLabel: 'requests/second',
                        phases: allPhases.filter(name => name.endsWith( (forkName !== "all" ? forkName : "") + "_" + metricName))
                      }}
                    />
                  )
                }}</AutoSizer>

              </CardBody>
            </Card>
          </PageSection>
        )
      )
    })
    return rtrn;
  }, [])
  return (
    <React.Fragment>
      <PageSection>
        <Card style={{ pageBreakInside: 'avoid' }}>
          <CardHeader>Run Summary</CardHeader>
          <CardBody>
            <TextContent>
              <dl>
                <dt>benchmark</dt><dd>{data.info.benchmark}</dd>
                <dt>ID</dt><dd>{data.info.id}</dd>
                <dt>description</dt><dd>{data.info.description}</dd>
                <dt>Start time</dt><dd>{DateTime.fromMillis(data.info.startTime).toFormat("yyyy-LL-dd HH:mm:ss ZZZ")}</dd>
                <dt>End time</dt><dd>{DateTime.fromMillis(data.info.terminateTime).toFormat("yyyy-LL-dd HH:mm:ss ZZZ")}</dd>
                <dt>Duration</dt><dd>{Duration.fromMillis(data.info.terminateTime - data.info.startTime).toFormat("hh:mm:ss.SSS")}</dd>
                <dt>failures</dt><dd>0</dd>
              </dl>
            </TextContent>
          </CardBody>
        </Card>
      </PageSection>
      {seriesCharts}
    </React.Fragment>
  )
})
const Summary = withRouter(({ history }) => {
  const forks = Object.keys(data.phase).reduce((rtrn, phaseName) => {
    
    const phase = data.phase[phaseName];
    Object.keys(phase.iteration).forEach(iterationName => {
      const iteration = phase.iteration[iterationName]

      
      Object.keys(iteration.fork).forEach(forkName => {
        const fork = iteration.fork[forkName];
        if (typeof rtrn[forkName] === "undefined") {
          rtrn[forkName] = {}
        }

        Object.keys(fork.metric).forEach(metricName => {
          if (typeof rtrn[forkName][metricName] === "undefined") {
            rtrn[forkName][metricName] = {}
          }
          if (typeof rtrn[forkName][metricName][phaseName] === "undefined") {
            rtrn[forkName][metricName][phaseName] = []
          }
          const entry = rtrn[forkName][metricName][phaseName];
          //const metric = fork.metric[metricName]
          const phaseLink = phaseName + (iterationName !== "all" ? "_" + iterationName : "") + (forkName !== "all" ? "_" + forkName: "")
          const phaseKey = phaseLink + "_" + metricName;
          entry.push({ name: phaseKey, onClick: (e) => history.push(phaseLink) });
        })
      })
    })
    return rtrn;
  }, {});
  const allPhases = data.total[0].data.map(row => row.Phase.replace(/\//g, "_") + (typeof row.Name !== "undefined" ? "_" + row.Name : "" ) + (typeof row.Metric !== "undefined" ? "_" + row.Metric : ""));
  const areaBars = getAreaBars(data.total[0]);
  const wideBars = Object.keys(forks).reduce((rtrn, forkName) => {
    const fork = forks[forkName]
    Object.keys(fork).forEach(metricName => {
      const metric = fork[metricName];
      const series = Object.keys(metric).map((metricName, metricIndex) => {
        return {
          name: metricName,
          colorGroup: colorNames[metricIndex],
          phases: metric[metricName],
          stats: ['Mean', 'p90.0', 'p99.0', 'p99.9'],
        }
      });
      rtrn.push(
        (
          <PageSection key={forkName + "_" + metricName}>
            <Card style={{ pageBreakInside: 'avoid' }}>
              <CardHeader>
                <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                  <ToolbarGroup><ToolbarItem>{`${forkName} ${metricName} response times`}</ToolbarItem></ToolbarGroup>
                  {/* <ToolbarGroup><ToolbarItem><Button variant="plain" aria-label="Action"><EditIcon /></Button></ToolbarItem></ToolbarGroup> */}
                </Toolbar>
              </CardHeader>
              <CardBody style={{ minHeight: 400 }}>
                <AutoSizer>{({ height, width }) => {
                  return (
                    <WideBarChart
                      height={height}
                      width={width}
                      data={areaBars}
                      domain={[data.info.startTime, data.info.terminateTime]}
                      bars={series}
                      right={{
                        name: "Requests/s",
                        color: '#A30000',
                        stat: 'Requests_ps',
                        scaleLabel: 'requests/second',
                        phases: allPhases.filter(name => name.endsWith((forkName!=="all"?forkName+"_":"") + metricName))
                      }}
                    />
                  )
                }}</AutoSizer>

              </CardBody>
            </Card>
          </PageSection>
        )
      )
    })
    return rtrn;
  }, [])

  return (
    <React.Fragment>
      <PageSection>
        <Card style={{ pageBreakInside: 'avoid' }}>
          <CardHeader>Run Summary</CardHeader>
          <CardBody>
            <TextContent>
              <dl>
                <dt>benchmark</dt><dd>{data.info.benchmark}</dd>
                <dt>ID</dt><dd>{data.info.id}</dd>
                <dt>description</dt><dd>{data.info.description}</dd>
                <dt>Start time</dt><dd>{DateTime.fromMillis(data.info.startTime).toFormat("yyyy-LL-dd HH:mm:ss ZZZ")}</dd>
                <dt>End time</dt><dd>{DateTime.fromMillis(data.info.terminateTime).toFormat("yyyy-LL-dd HH:mm:ss ZZZ")}</dd>
                <dt>Duration</dt><dd>{Duration.fromMillis(data.info.terminateTime - data.info.startTime).toFormat("hh:mm:ss.SSS")}</dd>
                <dt>failures</dt><dd>0</dd>
              </dl>
            </TextContent>
          </CardBody>
        </Card>
      </PageSection>
      {wideBars}
    </React.Fragment>
  )
});

const PhasePage = withRouter(({ history, match }) => {
  const phaseId = match.params.phaseId || false;
  if (!phaseId) {
    return `whoops, which phase is ${phaseId}?`
  }
  const { phase, iteration = "all", fork } = (phaseId.match(/(?<phase>[^_]+)_(?<iteration>[0-9]*)_?(?<fork>[^_]+)/) || { groups: {} }).groups;
  if (!phase) {
    return `whoops, which phase is ${phaseId}?`
  }
  const charts = Object.keys(data.phase[phase].iteration[iteration || "all"].fork[fork].metric).map((metricName, metricIndex) => {
    const hist = getHisto(data, phase, fork, iteration || "all", metricName)
    return (
      <PageSection key={metricName}>
        <Card style={{ pageBreakInside: 'avoid' }}>
          <CardHeader>
            <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
              <ToolbarGroup><ToolbarItem>{`${phase} ${iteration} ${fork} ${metricName} histogram`}</ToolbarItem></ToolbarGroup>
              {/* <ToolbarGroup><ToolbarItem><Button variant="plain" aria-label="Action"><EditIcon /></Button></ToolbarItem></ToolbarGroup> */}
            </Toolbar>
          </CardHeader>
          <CardBody style={{ minHeight: 410 }}>
            <AutoSizer>{({ height, width }) => {
              return (
                <HistoChart
                  height={height}
                  width={width}
                  data={hist}
                  right={{ name: "response time", key: '"Value"', color: "#002F5D" }}
                />
              )
            }}</AutoSizer>
          </CardBody>
        </Card>
      </PageSection>
    )
  })
  return (
    <React.Fragment>
      {/* <PageSection>
        <Card style={{pageBreakInside: 'avoid'}}>
          <CardHeader>{`${phase} ${iteration} ${fork} summary`}</CardHeader>
          <CardBody>
            <TextContent>
              <dl>
                <dt>Start time</dt><dd>{DateTime.fromMillis(data.info.startTime).toFormat("yyyy-LL-dd HH:mm:ss ZZZ")}</dd>
                <dt>End time</dt><dd>{DateTime.fromMillis(data.info.terminateTime).toFormat("yyyy-LL-dd HH:mm:ss ZZZ")}</dd>
                <dt>failures</dt><dd>0</dd>
              </dl>
            </TextContent>
          </CardBody>
        </Card>
      </PageSection> */}
      {charts}
    </React.Fragment>
  )
});

const EditTable = () => (
  <PageSection>
    <Card style={{ pageBreakInside: 'avoid' }}>
      <table>
        <thead>
          <tr>
            <td>Name</td>
            {theme.colors.chart[colorNames[0]].map((name, idx) => (<td key={idx}>{idx}</td>))}
          </tr>
        </thead>
        <tbody>
          {
            colorNames.map((name) => {
              const colors = theme.colors.chart[name]
              const colorTds = colors.map(color => (
                <td key={color} style={{ backgroundColor: color }}>{color}</td>
              ));
              return (<tr key={name}><td>{name}</td>{colorTds}</tr>)
            })
          }
        </tbody>
      </table>
    </Card>
    <Card style={{ pageBreakInside: 'avoid' }}>
      <CardHeader>
        <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
          <ToolbarGroup><ToolbarItem>Proxy test response times :: Edit</ToolbarItem></ToolbarGroup>
          {/* <ToolbarGroup><ToolbarItem><Button variant="plain" aria-label="Action"><EditIcon /></Button></ToolbarItem></ToolbarGroup> */}
          <ToolbarGroup><ToolbarItem><Button variant="danger" aria-label="Action"><TrashIcon /> Chart</Button></ToolbarItem></ToolbarGroup>
        </Toolbar>
      </CardHeader>
      <CardBody>
        <table className="pf-c-table pf-m-grid-md" role="grid">
          <caption>
            <Button variant="secondary"><PlusIcon /> Phase</Button>
            <Button variant="tertiary"><TrashIcon /> Phase</Button>
          </caption>
          <thead className="pf-m-no-border-rows">
            <tr>
              <th className="">Phase</th>
              <th className="">Metric</th>
              <th className="">Color</th>
              <th className="">Mean</th>
              <th className="">p90.0</th>
              <th className="">p99.0</th>
              <th className="">p99.9</th>
              <th className="">p99.99</th>
            </tr>
          </thead>
          <tbody className="">
            <tr>
              <td data-label="Phase">initialRampUp_proxy</td>
              <td data-label="Metric">test</td>
              <td data-label="Color">
                <Button variant="plain" style={{ backgroundColor: "#6753AC", height: 32 }} value=" " />
              </td>
              <td data-label="Mean">
                <input type="checkbox"></input>
              </td>
              <td data-label="p90.0">
                <input type="checkbox"></input>
              </td>
              <td data-label="p99.0">
                <input type="checkbox"></input>
              </td>
              <td data-label="p99.9">
                <input type="checkbox"></input>
              </td>
              <td data-label="p99.99">
                <input type="checkbox"></input>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8}>
                <Button variant="secondary" aria-label="Action"><SaveIcon />Save</Button>
                <Button variant="secondary" aria-label="Action"><TimesIcon />Cancel</Button>
              </td>
            </tr>
          </tfoot>
        </table>
      </CardBody>
    </Card>
  </PageSection>

)

const Header = ({ logoProps }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const linkEl = useRef(null);
  // const logoProps = {
  //   href: '/',
  //   onClick: (e) => {
  //     history.push('/')
  //     e.preventDefault()
  //   },
  //   //target: '_blank'
  // };
  const items = ["one", "two", "three", "four", "five", "six"]
  const filtered = items.filter(str => str.toLowerCase().indexOf(search.toLowerCase()) !== -1)
  return (
    <PageHeader
      //logo={(<span>Hyperfoil</span>)}
      //logoProps={logoProps}
      topNav={(
        <Nav aria-label="Nav">
          <NavList variant={NavVariants.horizontal}>
            <NavItem itemId={0} isActive={false}>
            </NavItem>
            <NavItem itemId={0} isActive={false}>
              <NavLink exact={true} to="/" activeClassName="pf-m-current">
                Summary
              </NavLink>
            </NavItem>
            <NavItem itemId={1} isActive={false}>
              <NavLink exact={true} to="/details" activeClassName="pf-m-current">
                Details
              </NavLink>
            </NavItem>
            <NavItem itemId={2} isActive={false} onClick={(e, itemId) => { setOpen(!open) }}>
              <span ref={linkEl} style={{cursor:"pointer"}}>Phases<CaretDownIcon /></span>
            </NavItem>
          </NavList>
          <Popover id="phases" open={open} anchorEl={linkEl.current} onClose={(e)=>{setOpen(false)}} anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        >
        <div style={{maxHeight:280,overflowY:'auto'}}>
          <nav className="pf-c-nav">
        <ul className="pf-c-nav__simple-list" role="menu" onClick={e=>setOpen(false)}>
        {Object.keys(phaseMetrics).map((phaseName, phaseIndex) => {
          const safeName = phaseName.replace(/\//g, "_")
          return (
            <li role="none" key={phaseIndex} className="pf-c-nav__item">
            <NavLink className="pf-c-nav__link" to={"/phase/" + safeName}>{safeName}</NavLink>
          </li>
          )

        })
        
        
        }
        </ul>
        </nav>
        </div>
        </Popover>
        </Nav>
      )}
    />
  )
}

const App = ({ history }) => {
  const logoProps = {
    href: '/',
    onClick: (e) => {
      history.push('/')
      e.preventDefault()
    },
    //target: '_blank'
  };

  //////////////////////////////////////////////////////////////////////////////////////////////////
  return (
    <Page header={(<Header logoProps={logoProps} />)} >
      <Helmet>
        <title>{`${data.info.id}`}</title>
      </Helmet>
      <Switch>
        <Route exact path="/" render={Summary} />
        <Route exact path="/details" render={Details} />
        <Route path="/phase/:phaseId" render={PhasePage} />
      </Switch>
    </Page>
  );
}

export default withRouter(App);
