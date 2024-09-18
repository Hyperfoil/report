import React, { useState, useRef } from 'react';
import {
    Button,
    Nav,
    PageHeader,
    NavItem,
    NavList,
    NavVariants,
    Toolbar,
    ToolbarGroup,
    ToolbarItem,
} from '@patternfly/react-core';
import {
    CaretDownIcon,
    ExclamationCircleIcon,
} from '@patternfly/react-icons';

import Popover from '@material-ui/core/Popover';
import { NavLink } from 'react-router-dom';

import { Helmet } from "react-helmet";

import { useSelector } from 'react-redux'
import { getCpu, getInfo, getAllNames, getAllFailures, allRunIdsSelector, getAllErrors } from '../redux/selectors';
import { selectRun } from '../redux/store'

import theme from '../theme';

const Menu = ({id, elementRef, isOpen, setOpen, items, childContent}) => (
   <Popover id="phases" open={isOpen} anchorEl={elementRef.current} onClose={(e) => { setOpen(false) }} anchorOrigin={{
         vertical: 'bottom',
         horizontal: 'center',
     }}
         transformOrigin={{
             vertical: 'top',
             horizontal: 'center',
         }}
     >
         <div style={{ maxHeight: 280, overflowY: 'auto' }}>
             <nav className="pf-c-nav">
                 <ul className="pf-c-nav__simple-list" role="menu" onClick={e => setOpen(false)}>
                     {items.map((item, itemIndex) => {
                         return (
                             <li role="none" key={itemIndex} className="pf-c-nav__item">
                                 { childContent(item) }
                             </li>
                         )
                     })
                     }
                 </ul>
             </nav>
         </div>
   </Popover>
)

export default ({ logoProps = {} }) => {
    const [open, setOpen] = useState(false)
    // const [search, setSearch] = useState("")
    const linkEl = useRef(null);

    const info = useSelector(getInfo)
    const phases = useSelector(getAllNames)
    const failures = useSelector(getAllFailures)
    const errors = useSelector(getAllErrors)
    const allRunIds = useSelector(allRunIdsSelector)
    const cpu = useSelector(getCpu)

    const [runSelectExpanded, setRunSelectExpanded] = useState(false)
    const runsEl = useRef(null)

    return (
        <PageHeader
            toolbar={(failures.length > 0 || errors.length > 0) ?
                (
                    <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                        <ToolbarGroup>
                            <ToolbarItem color={theme.colors.alert.danger[100]}>
                                <Button variant="plain">
                                    <ExclamationCircleIcon fill={theme.colors.alert.danger[100]}/>
                                    {failures.length + errors.length}
                                </Button>
                            </ToolbarItem>
                        </ToolbarGroup>
                    </Toolbar>
                )
                : null
            }
            topNav={(<>
                <Nav aria-label="Nav">
                    <NavList variant={NavVariants.horizontal}>
                        <NavItem itemId={0} isActive={false}>
                            <NavLink exact={true} to="/" activeClassName="pf-m-current">
                                Summary
                                <Helmet><title>{info.id || "HF:report"}</title></Helmet>{/*Moved here because PageHeader does not render children*/}
                            </NavLink>
                        </NavItem>
                        <NavItem itemId={2} isActive={false} onClick={(e, itemId) => { setOpen(!open) }}>
                            <span ref={linkEl} style={{ cursor: "pointer" }}>Phases<CaretDownIcon /></span>
                        </NavItem>
                        <NavItem itemId={3} isActive={false}>
                            <NavLink exact={true} to="/connections" activeClassName="pf-m-current">
                                Connections
                            </NavLink>
                        </NavItem>
                        <NavItem itemId={4} isActive={false}>
                            <NavLink exact={true} to="/sessions" activeClassName="pf-m-current">
                                Sessions
                            </NavLink>
                        </NavItem>
                        {failures && failures.length !== 0 ?
                            <NavItem itemId={5} isActive={false}>
                                <NavLink exact={true} to="/failures" activeClassName="pf-m-current">
                                    Failures
                                </NavLink>
                            </NavItem> : null
                        }
                        {errors && errors.length !== 0 ?
                            <NavItem itemId={6} isActive={false}>
                                <NavLink exact={true} to="/errors" activeClassName="pf-m-current">
                                    Errors
                                </NavLink>
                            </NavItem> : null
                        }
                        { cpu.length > 0 &&
                            <NavItem itemId={7} isActive={false}>
                                <NavLink exact={true} to="/cpu" activeClassName="pf-m-current">
                                CPU
                                </NavLink>
                            </NavItem>
                        }
                        { allRunIds.length > 1 && <>
                           <NavItem itemId={8} isActive={false} onClick={(e, itemId) => { setRunSelectExpanded(!runSelectExpanded) }}>
                               <span ref={runsEl} style={{ cursor: "pointer" }}>Select run<CaretDownIcon /></span>
                           </NavItem>
                           <NavItem itemId={9} isActive={false}>
                               <NavLink exact={true} to="/comparison" activeClassName="pf-m-current">
                                 Comparison
                               </NavLink>
                           </NavItem>
                        </>}
                    </NavList>
                    <Menu id="phases"
                          items={ phases }
                          elementRef={linkEl}
                          isOpen={open} setOpen={setOpen}
                          childContent={ p => (<NavLink className="pf-c-nav__link" to={ "/phase/" + p }>{p}</NavLink>) }
                    />
                    <Menu id="runs"
                          items={ allRunIds }
                          elementRef={runsEl}
                          isOpen={runSelectExpanded} setOpen={setRunSelectExpanded}
                          childContent={ r => (<Button variant="link" onClick={ () => selectRun(r) }>{r}</Button>) }
                    />
                </Nav>
            </>)}
        >
        </PageHeader>
    )
}