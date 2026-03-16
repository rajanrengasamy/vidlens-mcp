// ────────────────────────────────────────────────────────────────
// Raw YouTube Data API v3 responses vs VidLens compact outputs.
// Used by the token benchmark to verify reduction targets.
// ────────────────────────────────────────────────────────────────

// ── Raw YouTube API v3 video resource (videos.list, part=snippet,contentDetails,statistics,status,topicDetails,recordingDetails,player) ──

export const RAW_VIDEO_RESPONSE = {
  kind: "youtube#videoListResponse",
  etag: "xK3LjQhR9t5FpYn3z7Gk4b6Yz1A",
  items: [
    {
      kind: "youtube#video",
      etag: "dGBkR7T1pHm8mFxQ2LqWn0sVbXc",
      id: "dQw4w9WgXcQ",
      snippet: {
        publishedAt: "2009-10-25T06:57:33Z",
        channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
        title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
        description:
          "The official video for \"Never Gonna Give You Up\" by Rick Astley.\n\nThe new album 'Are We There Yet?' is out now: https://RickAstley.lnk.to/AreWeThereYetID\n\nStream & Download: https://RickAstley.lnk.to/NeverGonnaGiveYouUpID\n\n\"Never Gonna Give You Up\" was a global smash on its release in July 1987, topping the charts in 25 countries including Rick's native UK and the US Billboard Hot 100. It also won the Brit Award for Best British Single in 1988. Stock Aitken Waterman wrote and produced the track which was the lead single and lead track from Rick's debut album, 'Whenever You Need Somebody'.\n\nOfficial Website: https://www.rickastley.co.uk/\nTwitter: https://twitter.com/rickastley\nFacebook: https://www.facebook.com/RickAstley/\nInstagram: https://www.instagram.com/officialrickastley/\n\nLyrics:\nWe're no strangers to love\nYou know the rules and so do I\nA full commitment's what I'm thinking of\nYou wouldn't get this from any other guy\n\nI just wanna tell you how I'm feeling\nGotta make you understand\n\nNever gonna give you up\nNever gonna let you down\nNever gonna run around and desert you\nNever gonna make you cry\nNever gonna say goodbye\nNever gonna tell a lie and hurt you\n\n#RickAstley #NeverGonnaGiveYouUp #WheneverYouNeedSomebody #RickRoll",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            width: 480,
            height: 360,
          },
          standard: {
            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/sddefault.jpg",
            width: 640,
            height: 480,
          },
          maxres: {
            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
            width: 1280,
            height: 720,
          },
        },
        channelTitle: "Rick Astley",
        tags: [
          "rick astley",
          "never gonna give you up",
          "nggyu",
          "never gonna let you down",
          "rick rolled",
          "Rick Roll",
          "rick astley never gonna give you up",
          "never gonna give you up lyrics",
          "rickroll",
          "rick roll",
          "rick astley rick roll",
          "80s music",
          "music video",
          "pop music",
          "classic hits",
          "stock aitken waterman",
        ],
        categoryId: "10",
        liveBroadcastContent: "none",
        defaultLanguage: "en",
        localized: {
          title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
          description:
            "The official video for \"Never Gonna Give You Up\" by Rick Astley.",
        },
        defaultAudioLanguage: "en",
      },
      contentDetails: {
        duration: "PT3M33S",
        dimension: "2d",
        definition: "hd",
        caption: "true",
        licensedContent: true,
        regionRestriction: {
          blocked: [],
        },
        contentRating: {},
        projection: "rectangular",
        hasCustomThumbnail: true,
      },
      status: {
        uploadStatus: "processed",
        privacyStatus: "public",
        license: "youtube",
        embeddable: true,
        publicStatsViewable: true,
        madeForKids: false,
        selfDeclaredMadeForKids: false,
      },
      statistics: {
        viewCount: "1523847692",
        likeCount: "16842301",
        favoriteCount: "0",
        commentCount: "2847103",
      },
      player: {
        embedHtml:
          '<iframe width="480" height="270" src="//www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>',
      },
      topicDetails: {
        topicIds: ["/m/04rlf", "/m/02lkt", "/m/0ggq0m"],
        relevantTopicIds: [
          "/m/04rlf",
          "/m/02lkt",
          "/m/0ggq0m",
          "/m/05rwpb",
          "/m/03_d0",
        ],
        topicCategories: [
          "https://en.wikipedia.org/wiki/Music",
          "https://en.wikipedia.org/wiki/Pop_music",
          "https://en.wikipedia.org/wiki/Entertainment",
        ],
      },
      recordingDetails: {
        recordingDate: "1987-07-27",
      },
    },
  ],
  pageInfo: {
    totalResults: 1,
    resultsPerPage: 1,
  },
};

// ── VidLens compact inspectVideo response (matches InspectVideoOutput) ──

export const COMPACT_VIDEO_RESPONSE = {
  video: {
    videoId: "dQw4w9WgXcQ",
    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
    channelTitle: "Rick Astley",
    publishedAt: "2009-10-25T06:57:33Z",
    durationSec: 213,
    category: "10",
    tags: [
      "rick astley",
      "never gonna give you up",
      "nggyu",
      "never gonna let you down",
      "rick rolled",
      "Rick Roll",
      "rick astley never gonna give you up",
      "never gonna give you up lyrics",
      "rickroll",
      "rick roll",
      "rick astley rick roll",
      "80s music",
    ],
    language: "en",
  },
  stats: {
    views: 1523847692,
    likes: 16842301,
    comments: 2847103,
    likeRate: 0.011,
    commentRate: 0.00187,
    viewVelocity24h: 257143,
  },
  transcriptMeta: {
    available: true,
    languages: ["en"],
  },
  provenance: {
    sourceTier: "youtube_api",
    fetchedAt: "2025-03-10T12:00:00Z",
    fallbackDepth: 0,
    partial: false,
  },
};

// ── Raw YouTube API v3 channel resource (channels.list, part=snippet,statistics,contentDetails,brandingSettings,topicDetails,status) ──

export const RAW_CHANNEL_RESPONSE = {
  kind: "youtube#channelListResponse",
  etag: "kL8pZQm5NlvY9O7cXsG3rA1BxPc",
  items: [
    {
      kind: "youtube#channel",
      etag: "fR2mD4xQ7YwB3hNp8kSz0cU1eT6",
      id: "UCuAXFkgsw1L7xaCfnd5JJOw",
      snippet: {
        title: "Rick Astley",
        description:
          "Official YouTube channel for Rick Astley. Subscribe for the latest music videos, live performances, behind the scenes and more.\n\nRick Astley has been one of the most well-known and beloved pop artists since the late 1980s. His debut single \"Never Gonna Give You Up\" was a massive worldwide hit, and continues to find new fans through the internet phenomenon known as \"Rickrolling\".\n\nNew album 'Are We There Yet?' out now.\n\nBooking & Press: management@rickastley.co.uk\n\nFollow Rick:\nhttps://www.rickastley.co.uk\nhttps://twitter.com/rickastley\nhttps://www.facebook.com/RickAstley\nhttps://www.instagram.com/officialrickastley\nhttps://www.tiktok.com/@rickastleyofficial",
        customUrl: "@RickAstleyOfficial",
        publishedAt: "2006-08-07T02:15:17Z",
        thumbnails: {
          default: {
            url: "https://yt3.ggpht.com/BPfQHS5MfC9bMfC9bZe3B4X7pKxv_-_QePxZ6wRnKA=s88-c-k-c0x00ffffff-no-rj",
            width: 88,
            height: 88,
          },
          medium: {
            url: "https://yt3.ggpht.com/BPfQHS5MfC9bMfC9bZe3B4X7pKxv_-_QePxZ6wRnKA=s240-c-k-c0x00ffffff-no-rj",
            width: 240,
            height: 240,
          },
          high: {
            url: "https://yt3.ggpht.com/BPfQHS5MfC9bMfC9bZe3B4X7pKxv_-_QePxZ6wRnKA=s800-c-k-c0x00ffffff-no-rj",
            width: 800,
            height: 800,
          },
        },
        defaultLanguage: "en",
        localized: {
          title: "Rick Astley",
          description:
            "Official YouTube channel for Rick Astley. Subscribe for the latest music videos, live performances, behind the scenes and more.",
        },
        country: "GB",
      },
      contentDetails: {
        relatedPlaylists: {
          likes: "",
          uploads: "UUuAXFkgsw1L7xaCfnd5JJOw",
        },
      },
      statistics: {
        viewCount: "1872456123",
        subscriberCount: "14200000",
        hiddenSubscriberCount: false,
        videoCount: "195",
      },
      topicDetails: {
        topicIds: ["/m/04rlf", "/m/02lkt"],
        topicCategories: [
          "https://en.wikipedia.org/wiki/Music",
          "https://en.wikipedia.org/wiki/Pop_music",
        ],
      },
      status: {
        privacyStatus: "public",
        isLinked: true,
        longUploadsStatus: "longUploadsUnspecified",
        madeForKids: false,
        selfDeclaredMadeForKids: false,
      },
      brandingSettings: {
        channel: {
          title: "Rick Astley",
          description:
            "Official YouTube channel for Rick Astley. Subscribe for the latest music videos, live performances, behind the scenes and more.",
          keywords:
            '"rick astley" "never gonna give you up" "pop music" "80s music" rickroll "music video"',
          trackingAnalyticsAccountId: "UA-12345678-1",
          unsubscribedTrailer: "dQw4w9WgXcQ",
          defaultLanguage: "en",
          country: "GB",
        },
        image: {
          bannerExternalUrl:
            "https://yt3.googleusercontent.com/BPfQHS5MfC9bMfC9bZe3B4X7pKxv",
        },
      },
    },
  ],
  pageInfo: {
    totalResults: 1,
    resultsPerPage: 5,
  },
};

// ── VidLens compact inspectChannel response (matches InspectChannelOutput) ──

export const COMPACT_CHANNEL_RESPONSE = {
  channel: {
    channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
    title: "Rick Astley",
    handle: "RickAstleyOfficial",
    createdAt: "2006-08-07T02:15:17Z",
    country: "GB",
    descriptionSummary:
      "Official YouTube channel for Rick Astley. Subscribe for the latest music videos, live performances, behind the scenes and more.",
  },
  stats: {
    subscribers: 14200000,
    totalViews: 1872456123,
    totalVideos: 195,
    avgViewsPerVideo: 9602339,
  },
  cadence: {
    uploadsLast30d: 2,
    uploadsLast90d: 7,
    medianDaysBetweenUploads: 12,
  },
  provenance: {
    sourceTier: "youtube_api",
    fetchedAt: "2025-03-10T12:00:00Z",
    fallbackDepth: 0,
    partial: false,
  },
};

// ── Raw YouTube API v3 search response (search.list, part=snippet — 5 items plus hydrated videos.list details) ──

export const RAW_SEARCH_RESPONSE = {
  kind: "youtube#searchListResponse",
  etag: "mZ3pQ7rKdLqf0X8Y2sVBn4Tw1cE",
  nextPageToken: "CAUQAA",
  regionCode: "US",
  pageInfo: {
    totalResults: 1000000,
    resultsPerPage: 5,
  },
  items: [
    {
      kind: "youtube#searchResult",
      etag: "aB1cD2eF3gH4iJ5kL6mN7oP8qR9",
      id: {
        kind: "youtube#video",
        videoId: "jNQXAC9IVRw",
      },
      snippet: {
        publishedAt: "2005-04-23T18:19:54Z",
        channelId: "UC4QobU6STFB0P71PMvOGN5A",
        title: "Me at the zoo",
        description:
          "The first video on YouTube. While filming, a new idea was born. Today, YouTube is the world's most popular video-sharing platform.",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/jNQXAC9IVRw/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "jawed",
        liveBroadcastContent: "none",
        publishTime: "2005-04-23T18:19:54Z",
      },
    },
    {
      kind: "youtube#searchResult",
      etag: "sT9uV0wX1yZ2aB3cD4eF5gH6iJ7",
      id: {
        kind: "youtube#video",
        videoId: "9bZkp7q19f0",
      },
      snippet: {
        publishedAt: "2012-07-15T07:46:32Z",
        channelId: "UCrDkAvwZum-UTjHmzDI2iIw",
        title: "PSY - GANGNAM STYLE(강남스타일) M/V",
        description:
          "PSY - 'I LUV IT' M/V @ https://youtu.be/Xvjnoagk6GU\nPSY - 'New Face' M/V @https://youtu.be/OwJPPaEyqhI\nPSY - 8TH ALBUM '4X2=8' on iTunes @\nhttps://smarturl.it/PSY_8thAlbum\nPSY - GANGNAM STYLE (강남스타일) on iTunes @ http://smarturl.it/PsyGangnam",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/9bZkp7q19f0/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "officialpsy",
        liveBroadcastContent: "none",
        publishTime: "2012-07-15T07:46:32Z",
      },
    },
    {
      kind: "youtube#searchResult",
      etag: "kL8mN9oP0qR1sT2uV3wX4yZ5aB6",
      id: {
        kind: "youtube#video",
        videoId: "kJQP7kiw5Fk",
      },
      snippet: {
        publishedAt: "2017-01-13T14:00:04Z",
        channelId: "UCSFpIv5SZRg4CiCmcNGPw6A",
        title: "Luis Fonsi - Despacito ft. Daddy Yankee",
        description:
          "\"Despacito\" is a reggaeton and Latin pop song by Puerto Rican singer Luis Fonsi featuring Puerto Rican rapper Daddy Yankee from Fonsi's 2019 studio album Vida.\n\nFollow Luis Fonsi:\nhttps://www.instagram.com/luisfonsi\nhttps://twitter.com/LuisFonsi\nhttps://www.facebook.com/luisfonsi",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/kJQP7kiw5Fk/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "Luis Fonsi",
        liveBroadcastContent: "none",
        publishTime: "2017-01-13T14:00:04Z",
      },
    },
    {
      kind: "youtube#searchResult",
      etag: "cD7eF8gH9iJ0kL1mN2oP3qR4sT5",
      id: {
        kind: "youtube#video",
        videoId: "RgKAFK5djSk",
      },
      snippet: {
        publishedAt: "2013-11-19T11:00:26Z",
        channelId: "UC-9-kyTW8ZkZNDHQJ6FgpwQ",
        title: "Wiz Khalifa - See You Again ft. Charlie Puth [Official Video] Furious 7 Soundtrack",
        description:
          "Wiz Khalifa - See You Again ft. Charlie Puth [Official Video] Furious 7 Soundtrack\n\nDownload / Stream: https://atlantic.lnk.to/SeeYouAgainID\n\nSubscribe for more official content from Wiz Khalifa:\nhttps://Khalifa.lnk.to/Subscribe",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/RgKAFK5djSk/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/RgKAFK5djSk/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "Wiz Khalifa",
        liveBroadcastContent: "none",
        publishTime: "2013-11-19T11:00:26Z",
      },
    },
    {
      kind: "youtube#searchResult",
      etag: "uV6wX7yZ8aB9cD0eF1gH2iJ3kL4",
      id: {
        kind: "youtube#video",
        videoId: "JGwWNGJdvx8",
      },
      snippet: {
        publishedAt: "2011-08-19T14:07:48Z",
        channelId: "UCVHFbqXqoYvEWM1Ddxl0QDg",
        title: "Ed Sheeran - Shape of You [Official Music Video]",
        description:
          "The official music video for Ed Sheeran - Shape Of You\n\nThe album 'Divide' is available to stream & download now: https://atlanti.cr/yt-album\n\nSubscribe to Ed's channel: https://www.youtube.com/channel/UCVHFbqXqoYvEWM1Ddxl0QDg",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/JGwWNGJdvx8/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "Ed Sheeran",
        liveBroadcastContent: "none",
        publishTime: "2011-08-19T14:07:48Z",
      },
    },
  ],
  // The raw response also includes the hydrated videos.list data that YouTube API returns
  // when the client fetches video details for statistics/contentDetails
  _hydratedVideoDetails: [
    {
      kind: "youtube#video",
      etag: "vW8xY9zA0bC1dE2fG3hI4jK5lM6",
      id: "jNQXAC9IVRw",
      snippet: {
        publishedAt: "2005-04-23T18:19:54Z",
        channelId: "UC4QobU6STFB0P71PMvOGN5A",
        title: "Me at the zoo",
        description:
          "The first video on YouTube. While filming, a new idea was born.",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/jNQXAC9IVRw/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "jawed",
        tags: ["zoo", "first video", "youtube", "elephants"],
        categoryId: "22",
        liveBroadcastContent: "none",
        defaultAudioLanguage: "en",
      },
      contentDetails: {
        duration: "PT0M19S",
        dimension: "2d",
        definition: "sd",
        caption: "true",
        licensedContent: false,
        contentRating: {},
        projection: "rectangular",
      },
      statistics: {
        viewCount: "312456789",
        likeCount: "12345678",
        favoriteCount: "0",
        commentCount: "1587432",
      },
    },
    {
      kind: "youtube#video",
      etag: "nO7pQ8rS9tU0vW1xY2zA3bC4dE5",
      id: "9bZkp7q19f0",
      snippet: {
        publishedAt: "2012-07-15T07:46:32Z",
        channelId: "UCrDkAvwZum-UTjHmzDI2iIw",
        title: "PSY - GANGNAM STYLE(강남스타일) M/V",
        description:
          "PSY - 'I LUV IT' M/V @ https://youtu.be/Xvjnoagk6GU\nPSY - 'New Face' M/V @https://youtu.be/OwJPPaEyqhI",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/9bZkp7q19f0/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "officialpsy",
        tags: [
          "PSY",
          "싸이",
          "강남스타일",
          "뮤직비디오",
          "Gangnam Style",
          "K-pop",
          "Korean pop",
          "dance",
        ],
        categoryId: "10",
        liveBroadcastContent: "none",
        defaultAudioLanguage: "ko",
      },
      contentDetails: {
        duration: "PT4M13S",
        dimension: "2d",
        definition: "hd",
        caption: "true",
        licensedContent: true,
        contentRating: {},
        projection: "rectangular",
      },
      statistics: {
        viewCount: "4987654321",
        likeCount: "24567890",
        favoriteCount: "0",
        commentCount: "6543210",
      },
    },
    {
      kind: "youtube#video",
      etag: "fG6hI7jK8lM9nO0pQ1rS2tU3vW4",
      id: "kJQP7kiw5Fk",
      snippet: {
        publishedAt: "2017-01-13T14:00:04Z",
        channelId: "UCSFpIv5SZRg4CiCmcNGPw6A",
        title: "Luis Fonsi - Despacito ft. Daddy Yankee",
        description:
          "\"Despacito\" is a reggaeton and Latin pop song by Puerto Rican singer Luis Fonsi.",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/kJQP7kiw5Fk/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "Luis Fonsi",
        tags: [
          "despacito",
          "luis fonsi",
          "daddy yankee",
          "reggaeton",
          "latin pop",
          "music video",
        ],
        categoryId: "10",
        liveBroadcastContent: "none",
        defaultAudioLanguage: "es",
      },
      contentDetails: {
        duration: "PT4M42S",
        dimension: "2d",
        definition: "hd",
        caption: "true",
        licensedContent: true,
        contentRating: {},
        projection: "rectangular",
      },
      statistics: {
        viewCount: "8234567890",
        likeCount: "51234567",
        favoriteCount: "0",
        commentCount: "8765432",
      },
    },
    {
      kind: "youtube#video",
      etag: "xY5zA6bC7dE8fG9hI0jK1lM2nO3",
      id: "RgKAFK5djSk",
      snippet: {
        publishedAt: "2013-11-19T11:00:26Z",
        channelId: "UC-9-kyTW8ZkZNDHQJ6FgpwQ",
        title:
          "Wiz Khalifa - See You Again ft. Charlie Puth [Official Video] Furious 7 Soundtrack",
        description:
          "Wiz Khalifa - See You Again ft. Charlie Puth [Official Video] Furious 7 Soundtrack",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/RgKAFK5djSk/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/RgKAFK5djSk/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "Wiz Khalifa",
        tags: [
          "wiz khalifa",
          "see you again",
          "charlie puth",
          "furious 7",
          "fast and furious",
          "paul walker",
          "soundtrack",
        ],
        categoryId: "10",
        liveBroadcastContent: "none",
        defaultAudioLanguage: "en",
      },
      contentDetails: {
        duration: "PT3M58S",
        dimension: "2d",
        definition: "hd",
        caption: "true",
        licensedContent: true,
        contentRating: {},
        projection: "rectangular",
      },
      statistics: {
        viewCount: "6012345678",
        likeCount: "32456789",
        favoriteCount: "0",
        commentCount: "5678901",
      },
    },
    {
      kind: "youtube#video",
      etag: "pQ4rS5tU6vW7xY8zA9bC0dE1fG2",
      id: "JGwWNGJdvx8",
      snippet: {
        publishedAt: "2011-08-19T14:07:48Z",
        channelId: "UCVHFbqXqoYvEWM1Ddxl0QDg",
        title: "Ed Sheeran - Shape of You [Official Music Video]",
        description:
          "The official music video for Ed Sheeran - Shape Of You",
        thumbnails: {
          default: {
            url: "https://i.ytimg.com/vi/JGwWNGJdvx8/default.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
            width: 480,
            height: 360,
          },
        },
        channelTitle: "Ed Sheeran",
        tags: [
          "ed sheeran",
          "shape of you",
          "official music video",
          "divide",
          "atlantic records",
          "pop",
        ],
        categoryId: "10",
        liveBroadcastContent: "none",
        defaultAudioLanguage: "en",
      },
      contentDetails: {
        duration: "PT4M24S",
        dimension: "2d",
        definition: "hd",
        caption: "true",
        licensedContent: true,
        contentRating: {},
        projection: "rectangular",
      },
      statistics: {
        viewCount: "6345678901",
        likeCount: "29876543",
        favoriteCount: "0",
        commentCount: "3456789",
      },
    },
  ],
};

// ── VidLens compact findVideos response (matches FindVideosOutput) ──

export const COMPACT_SEARCH_RESPONSE = {
  query: "most viewed youtube videos",
  results: [
    {
      videoId: "jNQXAC9IVRw",
      title: "Me at the zoo",
      channelId: "UC4QobU6STFB0P71PMvOGN5A",
      channelTitle: "jawed",
      publishedAt: "2005-04-23T18:19:54Z",
      durationSec: 19,
      views: 312456789,
      engagementRate: 0.0446,
    },
    {
      videoId: "9bZkp7q19f0",
      title: "PSY - GANGNAM STYLE(강남스타일) M/V",
      channelId: "UCrDkAvwZum-UTjHmzDI2iIw",
      channelTitle: "officialpsy",
      publishedAt: "2012-07-15T07:46:32Z",
      durationSec: 253,
      views: 4987654321,
      engagementRate: 0.0062,
    },
    {
      videoId: "kJQP7kiw5Fk",
      title: "Luis Fonsi - Despacito ft. Daddy Yankee",
      channelId: "UCSFpIv5SZRg4CiCmcNGPw6A",
      channelTitle: "Luis Fonsi",
      publishedAt: "2017-01-13T14:00:04Z",
      durationSec: 282,
      views: 8234567890,
      engagementRate: 0.0073,
    },
    {
      videoId: "RgKAFK5djSk",
      title: "Wiz Khalifa - See You Again ft. Charlie Puth [Official Video] Furious 7 Soundtrack",
      channelId: "UC-9-kyTW8ZkZNDHQJ6FgpwQ",
      channelTitle: "Wiz Khalifa",
      publishedAt: "2013-11-19T11:00:26Z",
      durationSec: 238,
      views: 6012345678,
      engagementRate: 0.0063,
    },
    {
      videoId: "JGwWNGJdvx8",
      title: "Ed Sheeran - Shape of You [Official Music Video]",
      channelId: "UCVHFbqXqoYvEWM1Ddxl0QDg",
      channelTitle: "Ed Sheeran",
      publishedAt: "2011-08-19T14:07:48Z",
      durationSec: 264,
      views: 6345678901,
      engagementRate: 0.0053,
    },
  ],
  provenance: {
    sourceTier: "youtube_api",
    fetchedAt: "2025-03-10T12:00:00Z",
    fallbackDepth: 0,
    partial: false,
  },
};
