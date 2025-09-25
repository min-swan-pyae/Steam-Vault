# Steam Vault - Use Case Diagram

## System Overview

Steam Vault is a comprehensive gaming platform that provides CS2 statistics tracking, marketplace monitoring, and community features through Steam OAuth and Gmail integration.## 🔔 Notification System

### Primary Actors
- **Verified Users**: Receive in-app and email notifications

### Use Cases
1. **Price Alerts**: ✅ Implemented - Immediate notifications when watchlist items drop in price
2. **Forum Notifications**: 🚧 Planned - Alerts for replies, mentions, and forum activity
3. **Market Trends**: 🚧 Planned - Weekly market analysis and trending items
4. **Weekly Digest**: 🚧 Planned - Summary of gaming activity and community updates
5. **System Announcements**: ✅ Implemented - Important updates and maintenance notifications
6. **Preference Management**: ✅ Implemented - Granular control over notification types and frequency

### Testing
In development mode, use `/settings` page notification tester to send test notifications of each type.maid
flowchart TB
    %% User Types
    Guest("👤 Guest User"):::guestClass
    User("👤 Authenticated User<br/>(Steam Account)"):::userClass
    Verified("✓ Verified User<br/>(Gmail Connected)"):::verifiedClass
    Mod("👮 Moderator"):::modClass
    Admin("👨‍💼 Administrator"):::adminClass

    %% Core Authentication
    subgraph AUTH ["🔐 Authentication System"]
        SteamLogin("Steam OAuth Login")
        GmailConnect("Connect Gmail Account")
        EmailVerify("Verify Email Address")
        Logout("Logout")
    end

    %% User Profile Management
    subgraph PROFILE ["👤 User Profile Management"]
        ViewProfile("View Profile")
        EditProfile("Edit Profile Settings")
        ManagePrivacy("Manage Privacy Settings")
        ViewStats("View Personal Statistics")
        DeleteAccount("Delete Account")
    end

    %% CS2 Features
    subgraph CS2 ["🎮 CS2 Dashboard & Statistics"]
        SetupGSI("Setup Game State Integration")
        ViewMatchHistory("View Match History")
        ViewWeaponStats("View Weapon Statistics")
        ViewMapStats("View Map Performance")
        ViewLeaderboards("View Leaderboards")
        SearchPlayers("Search Players")
        ViewPlayerProfile("View Other Player Profiles")
        ExportStats("Export Statistics")
    end

    %% Marketplace Features
    subgraph MARKET ["🛒 Marketplace & Watchlist"]
        BrowseMarket("Browse Marketplace")
        SearchItems("Search Items")
        FilterSort("Filter & Sort Results")
        AddWatchlist("Add Items to Watchlist")
        ManageWatchlist("Manage Watchlist")
        SetPriceAlerts("Set Price Alerts")
        ViewPriceHistory("View Price History")
        RemoveWatchlist("Remove from Watchlist")
    end

    %% Notification System
    subgraph NOTIFY ["🔔 Notification System"]
        ReceiveNotifications("Receive In-App Notifications")
        EmailNotifications("Receive Email Notifications")
        ManageNotifSettings("Manage Notification Preferences")
        MarkAsRead("Mark Notifications as Read")
        PriceDropAlerts("Receive Price Drop Alerts")
    end

    %% Community Forum
    subgraph FORUM ["💬 Community Forums"]
        ViewCategories("View Forum Categories")
        ViewPosts("View Forum Posts")
        CreatePost("Create New Post")
        ReplyToPost("Reply to Posts")
        EditContent("Edit Posts/Comments")
        DeleteContent("Delete Posts/Comments")
        LikeDislike("Like/Dislike Content")
        SearchForum("Search Forum Content")
        ViewUserActivity("View User Activity")
    end

    %% Content Moderation
    subgraph MODERATION ["🛡️ Content Moderation"]
        ReportContent("Report Inappropriate Content")
        ReviewReports("Review Reports")
        ModerateContent("Moderate Content")
        BanUsers("Ban/Unban Users")
        DeleteReportedContent("Delete Reported Content")
        ManageCategories("Manage Forum Categories")
    end

    %% System Administration
    subgraph ADMIN ["⚙️ System Administration"]
        ViewSystemStats("View System Statistics")
        ManageUsers("Manage User Accounts")
        ConfigureSystem("Configure System Settings")
        ManageIndexes("Manage Database Indexes")
        ViewLogs("View System Logs")
        BackupData("Backup System Data")
        ManageSecurity("Manage Security Rules")
    end

    %% User Connections and Permissions
    Guest --> SteamLogin
    
    User --> GmailConnect
    User --> ViewProfile
    User --> SetupGSI
    User --> BrowseMarket
    User --> ViewCategories
    User --> ViewPosts
    User --> SearchItems
    User --> ViewMatchHistory
    User --> ViewLeaderboards
    User --> SearchPlayers
    User --> ViewPlayerProfile
    User --> Logout

    Verified --> CreatePost
    Verified --> ReplyToPost
    Verified --> EditContent
    Verified --> DeleteContent
    Verified --> AddWatchlist
    Verified --> SetPriceAlerts
    Verified --> ReceiveNotifications
    Verified --> EmailNotifications
    Verified --> ReportContent
    Verified --> EditProfile
    Verified --> ManagePrivacy
    Verified --> ManageNotifSettings
    Verified --> ManageWatchlist

    Mod --> ReviewReports
    Mod --> ModerateContent
    Mod --> DeleteReportedContent
    Mod --> BanUsers
    Mod --> ManageCategories

    Admin --> ViewSystemStats
    Admin --> ManageUsers
    Admin --> ConfigureSystem
    Admin --> ManageIndexes
    Admin --> ViewLogs
    Admin --> BackupData
    Admin --> ManageSecurity

    %% Feature Dependencies
    GmailConnect --> EmailVerify
    EmailVerify --> EmailNotifications
    EmailVerify --> PriceDropAlerts
    SetPriceAlerts --> PriceDropAlerts
    AddWatchlist --> ManageWatchlist
    AddWatchlist --> ViewPriceHistory
    CreatePost --> EditContent
    CreatePost --> DeleteContent
    ReplyToPost --> EditContent
    ReplyToPost --> DeleteContent
    
    %% System Integrations
    subgraph EXTERNAL ["🔌 External Integrations"]
        SteamAPI("Steam API")
        SteamGSI("Steam GSI")
        GmailAPI("Gmail API")
        SteamMarketAPI("Steam Market API")
    end

    SetupGSI -.-> SteamGSI
    ViewMatchHistory -.-> SteamGSI
    ViewWeaponStats -.-> SteamGSI
    ViewMapStats -.-> SteamGSI
    SteamLogin -.-> SteamAPI
    GmailConnect -.-> GmailAPI
    EmailNotifications -.-> GmailAPI
    BrowseMarket -.-> SteamMarketAPI
    SearchItems -.-> SteamMarketAPI
    ViewPriceHistory -.-> SteamMarketAPI

    %% Styling
    classDef guestClass fill:#ffebee,stroke:#f44336,stroke-width:2px
    classDef userClass fill:#e8f5e8,stroke:#4caf50,stroke-width:2px
    classDef verifiedClass fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    classDef modClass fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    classDef adminClass fill:#fce4ec,stroke:#e91e63,stroke-width:2px
```

## Use Case Descriptions

### 🔐 Authentication System

#### Primary Actors
- **Guest Users**: Can only view public content and initiate Steam login
- **All Users**: Can authenticate and manage their sessions

#### Use Cases
1. **Steam OAuth Login**: Users authenticate using their Steam account
2. **Gmail Integration**: Verified users connect their Gmail for enhanced features
3. **Email Verification**: Users verify their Gmail connection for full access
4. **Session Management**: Secure session handling with automatic expiration

### 👤 User Profile Management

#### Primary Actors
- **Authenticated Users**: Can view and manage their own profiles
- **Verified Users**: Can access enhanced profile features

#### Use Cases
1. **Profile Customization**: Users can set display names, signatures, and preferences
2. **Privacy Controls**: Users control what information is publicly visible
3. **Account Management**: Users can update settings or delete their account
4. **Statistics Display**: Users can view their gaming and forum statistics

### 🎮 CS2 Dashboard & Statistics

#### Primary Actors
- **Authenticated Users**: Can view public statistics and leaderboards
- **Game Players**: Can track their own performance through GSI integration

#### Use Cases
1. **Game State Integration**: Real-time match data collection during CS2 matches
2. **Performance Analytics**: Detailed weapon, map, and overall performance tracking
3. **Leaderboards**: Community rankings based on various metrics
4. **Player Discovery**: Search and view other players' public statistics
5. **Data Export**: Export personal statistics for external analysis

### 🛒 Marketplace & Watchlist

#### Primary Actors
- **All Users**: Can browse and search marketplace items
- **Verified Users**: Can manage watchlists and receive price alerts

#### Use Cases
1. **Market Browsing**: Search, filter, and sort Steam Community Market items
2. **Watchlist Management**: Track favorite items with price monitoring
3. **Price Alerting**: Automated notifications when target prices are reached
4. **Price History**: Historical price tracking and trend analysis

### 🔔 Notification System

#### Primary Actors
- **Verified Users**: Receive in-app and email notifications

#### Use Cases
1. **Price Alerts**: Immediate notifications when watchlist items drop in price
2. **Forum Notifications**: Alerts for replies, mentions, and forum activity
3. **System Announcements**: Important updates and maintenance notifications
4. **Preference Management**: Granular control over notification types and frequency

### 💬 Community Forums

#### Primary Actors
- **Authenticated Users**: Can view and read forum content
- **Verified Users**: Can create and interact with forum content

#### Use Cases
1. **Content Creation**: Create posts and comments with rich formatting
2. **Content Interaction**: Like, dislike, and reply to community content
3. **Content Management**: Edit and delete own posts and comments
4. **Community Discovery**: Search forums and discover relevant discussions
5. **Activity Tracking**: View personal forum activity and history

### 🛡️ Content Moderation

#### Primary Actors
- **Verified Users**: Can report inappropriate content
- **Moderators**: Can review and moderate reported content
- **Administrators**: Can manage moderation system and policies

#### Use Cases
1. **Content Reporting**: Users can report toxic, spam, or inappropriate content
2. **Automated Detection**: System automatically flags potentially toxic content
3. **Moderation Workflow**: Structured process for reviewing and resolving reports
4. **User Management**: Ban/unban users and manage community standards
5. **Category Management**: Organize forum topics and manage permissions

### ⚙️ System Administration

#### Primary Actors
- **Administrators**: Full system access and management capabilities

#### Use Cases
1. **User Management**: Promote users to moderators, manage bans and permissions
2. **System Configuration**: Manage application settings and feature flags
3. **Database Management**: Monitor indexes, performance, and data integrity
4. **Security Management**: Configure Firestore rules and access controls
5. **Analytics**: Monitor system usage, performance metrics, and user engagement

## Key System Features

### 🔒 Security & Privacy
- **Multi-level Authentication**: Steam OAuth + Gmail verification
- **Granular Privacy Controls**: Users control data visibility
- **Content Moderation**: Automated and manual content filtering
- **Rate Limiting**: API abuse prevention

### 📊 Data Management
- **Real-time Updates**: GSI integration for live game data
- **Automated Cleanup**: 1-month retention for activity logs
- **Price Monitoring**: Background price checking for watchlist items
- **Caching Strategy**: Intelligent caching for performance

### 🎯 User Experience
- **Progressive Feature Access**: Features unlock with verification levels
- **Professional UI**: Search-only marketplace interactions
- **Responsive Design**: Works across all devices
- **Rich Notifications**: In-app and email notification system

### 🔧 Technical Integration
- **Steam API**: Authentication and basic profile data
- **Steam GSI**: Real-time CS2 match data
- **Steam Market API**: Item prices and market data
- **Gmail API**: Email notifications and verification
- **Firebase**: Real-time database and authentication
- **Node.js Backend**: API services and business logic
- **React Frontend**: Modern, responsive user interface