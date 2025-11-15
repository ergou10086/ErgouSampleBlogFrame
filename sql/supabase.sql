-- 用户扩展信息表
CREATE TABLE user_profiles (
                               id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                               username VARCHAR(50) UNIQUE NOT NULL,
                               display_name VARCHAR(100),
                               avatar_url TEXT,
                               bio TEXT,
                               created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                               updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 文章表
CREATE TABLE posts (
                       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                       title VARCHAR(200) NOT NULL,
                       slug VARCHAR(200) UNIQUE NOT NULL,
                       content TEXT NOT NULL,
                       excerpt TEXT, -- 摘要
                       cover_image TEXT, -- 封面图
                       status VARCHAR(20) DEFAULT 'draft', -- draft, published
                       view_count INTEGER DEFAULT 0,
                       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                       published_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引以提升查询性能
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_slug ON posts(slug);

-- 分类表
CREATE TABLE categories (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            name VARCHAR(50) UNIQUE NOT NULL,
                            slug VARCHAR(50) UNIQUE NOT NULL,
                            description TEXT,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- user_profiles 策略
CREATE POLICY "用户可以查看所有用户信息"
  ON user_profiles FOR SELECT
                                  USING (true);

CREATE POLICY "用户可以创建自己的资料"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "用户只能更新自己的信息"
  ON user_profiles FOR UPDATE
                                  USING (auth.uid() = id);

-- posts 策略
CREATE POLICY "所有人可以查看已发布的文章"
  ON posts FOR SELECT
                          USING (status = 'published' OR user_id = auth.uid());

CREATE POLICY "用户可以创建自己的文章"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的文章"
  ON posts FOR UPDATE
                                 USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的文章"
  ON posts FOR DELETE
USING (auth.uid() = user_id);