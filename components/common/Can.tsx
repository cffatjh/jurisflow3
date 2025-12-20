import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Permission } from '../../types';

interface CanProps {
    perform: Permission;
    yes?: React.ReactNode; // Render if allowed
    no?: React.ReactNode;  // Render if denied (optional)
    children?: React.ReactNode; // Defaults to yes behavior if yes prop not provided
}

export const Can: React.FC<CanProps> = ({ perform, yes, no, children }) => {
    const { can } = useAuth();

    if (can(perform)) {
        return <>{yes || children}</>;
    }

    return <>{no}</>;
};
