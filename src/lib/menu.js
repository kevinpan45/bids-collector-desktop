let menus = [
    { 
        name: "dashboard", 
        link: "/", 
        alias: "Dashboard", 
        icon: "heroicons:home", 
        enabled: true 
    },
    { 
        name: "profile", 
        link: "/profile", 
        alias: "Profile", 
        icon: "profile", 
        enabled: true 
    },
    { 
        name: "job", 
        link: "/job", 
        alias: "Job Management", 
        icon: "heroicons:briefcase", 
        enabled: true 
    }
];

export function getMenus() {
    return menus;
}
