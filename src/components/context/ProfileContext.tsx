import React, {
    createContext,
    useContext
} from "react";

import useLocalStorage from "../utils/useLocalStorage";

type ProfileContextType = {
    authorName: string;
    authorAvatar: string;
    updateProfile: (name: string, avatar: string) => void;
};

const ProfileContext =
    createContext<ProfileContextType | undefined>(
        undefined
    );

type ProfileProviderProps = {
    children: React.ReactNode;
};

export const ProfileProvider: React.FC<
    ProfileProviderProps
> = ({children}) => {
    const [authorName, setAuthorName] =
        useLocalStorage<string>(
            "ammber/authorName",
            ""
        );

    const [authorAvatar, setAuthorAvatar] =
        useLocalStorage<string>(
            "ammber/authorAvatar",
            ""
        );

    const updateProfile = (
        name: string,
        avatar: string
    ) => {
        setAuthorName(name);
        setAuthorAvatar(avatar);
    };

    const value = {
        authorName,
        authorAvatar,
        updateProfile
    };

    return (
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfileContext = () => {
    const context =
        useContext(ProfileContext);

    if (!context) {
        throw new Error(
            "useProfileContext must be used within ProfileProvider"
        );
    }

    return context;
};
