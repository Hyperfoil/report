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
    WarningTriangleIcon

} from '@patternfly/react-icons';

import Popover from '@material-ui/core/Popover';
import { NavLink } from 'react-router-dom';

import { useSelector } from 'react-redux'
import { getAllNames, getAllFailures } from '../redux/selectors';

import theme from '../theme';


export default ({ logoProps = {} }) => {
    const [open, setOpen] = useState(false)
    // const [search, setSearch] = useState("")
    const linkEl = useRef(null);

    const phases = useSelector(getAllNames)
    const failures = useSelector(getAllFailures)

    return (
        <PageHeader
            toolbar={failures.length > 0 ? 
                (
                    <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                        <ToolbarGroup>
                            <ToolbarItem color={theme.colors.alert.danger[100]}>
                                <Button variant="plain">
                                    <ExclamationCircleIcon fill={theme.colors.alert.danger[100]}/>
                                    {failures.length}
                                </Button>
                            </ToolbarItem>
                        </ToolbarGroup>                        
                    </Toolbar>
                )
                 :
                null
            }
            topNav={(
                <Nav aria-label="Nav">
                    <NavList variant={NavVariants.horizontal}>
                        <NavItem itemId={0} isActive={false}>
                            <NavLink exact={true} to="/" activeClassName="pf-m-current">
                                Summary
                            </NavLink>
                        </NavItem>
                        <NavItem itemId={0} isActive={false}>
                            <NavLink exact={true} to="/details" activeClassName="pf-m-current">
                                Details
                            </NavLink>
                        </NavItem>
                        <NavItem itemId={2} isActive={false} onClick={(e, itemId) => { setOpen(!open) }}>
                            <span ref={linkEl} style={{ cursor: "pointer" }}>Phases<CaretDownIcon /></span>
                        </NavItem>
                        {failures && !failures.length === 0 ?
                            <NavItem itemId={0} isActive={false}>
                                <NavLink exact={true} to="/failures" activeClassName="pf-m-current">
                                    Failures
                                </NavLink>
                            </NavItem> : null
                        }
                    </NavList>
                    <Popover id="phases" open={open} anchorEl={linkEl.current} onClose={(e) => { setOpen(false) }} anchorOrigin={{
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
                                    {phases.map((phaseName, phaseIndex) => {
                                        const safeName = phaseName;//.replace(/\//g, "_")
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
        >

        </PageHeader>
    )
}